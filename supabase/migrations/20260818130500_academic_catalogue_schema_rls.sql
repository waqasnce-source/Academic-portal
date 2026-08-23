-- RLS for catalogue_notes. Mirrors the standard structure: blanket
-- table-level GRANT to anon/authenticated/service_role (RLS is the
-- actual gate), one policy per operation.
--
-- Management-only for every operation, including SELECT: this is
-- internal editorial/data-quality metadata about the catalogue (which
-- source records are ambiguous or unverified), not academic record data
-- a student or faculty member has any standing reason to see. No new
-- scoping mechanism -- reuses has_role('management') exactly as every
-- other management-only table in this schema does.

alter table public.catalogue_notes enable row level security;

grant select, insert, update, delete on table public.catalogue_notes to anon;
grant select, insert, update, delete on table public.catalogue_notes to authenticated;
grant select, insert, update, delete on table public.catalogue_notes to service_role;

create policy "catalogue_notes_select_management"
  on public.catalogue_notes
  as permissive
  for select
  to authenticated
  using (public.has_role('management'));

create policy "catalogue_notes_insert_management"
  on public.catalogue_notes
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "catalogue_notes_update_management"
  on public.catalogue_notes
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "catalogue_notes_delete_management"
  on public.catalogue_notes
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));
