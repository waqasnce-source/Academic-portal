-- Phase 9.1 audit — fixes a genuine privilege-escalation hole found while
-- auditing account provisioning.
--
-- profiles_update_authenticated (20260813152648_remote_schema.sql):
--   using (has_role('management') OR id = auth.uid())
--   with check (has_role('management') OR id = auth.uid())
--
-- RLS predicates restrict which ROW an authenticated user may touch, never
-- which COLUMN. Grepping every `.from("profiles")` call site in the app
-- confirms no code today performs a self-service profile update — every
-- write goes through lib/management/accounts.ts, gated by
-- requireRole("management"). That means the self-update branch
-- (`id = auth.uid()`) is currently exercised by zero legitimate app code,
-- yet it is fully live at the database level: any authenticated
-- student/faculty session could call the Supabase REST API directly
-- (bypassing the Next.js app entirely — they already hold a valid JWT
-- plus the public anon/publishable key) and PATCH their own profiles row
-- with {"role":"management"}, silently escalating to full management RLS
-- privileges platform-wide the moment requireRole("management") next
-- reads it. Same reasoning applies to `status` (the login gate itself)
-- and `email` (identity spoofing / confusing the duplicate-account checks
-- in lib/management/accounts.ts's provisionAccount()).
--
-- Fix: rather than removing the self-update RLS branch (which would
-- foreclose a legitimate future "edit my profile" feature for
-- full_name/phone/avatar_url), add a trigger that blocks changing
-- role/status/email unless the caller already has the management role.
-- Defense in depth — this holds even if profiles_update_authenticated is
-- ever loosened further. Management's own ability to change any profile's
-- role/status/email (e.g. via a future admin UI) is unaffected, since
-- has_role('management') is evaluated against the caller's own,
-- pre-existing role.

create or replace function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if not public.has_role('management') then
    if new.role is distinct from old.role then
      raise exception 'Only management may change a profile''s role.';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Only management may change a profile''s status.';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Only management may change a profile''s email.';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_profile_self_privilege_escalation() is
  'BEFORE UPDATE trigger on profiles: blocks a non-management caller from changing role/status/email on any row (including their own). Closes a privilege-escalation path that profiles_update_authenticated''s row-only RLS predicate cannot express by itself. See migration header for the audit finding this fixes.';

create trigger trg_profiles_prevent_self_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.prevent_profile_self_privilege_escalation();
