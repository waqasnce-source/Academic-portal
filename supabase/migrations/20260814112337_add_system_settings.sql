-- Adds system_settings: a minimal, management-editable settings table for
-- exactly the two MVP settings approved in the Reports & System Settings
-- schema analysis — Minimum Attendance Percentage and Institution
-- Timezone. No other proposed settings (Minimum Passing Marks,
-- Institution Name, Default Notice Expiry, Enrollment Window, Contact
-- Email, Current Semester) are added — those were explicitly deferred
-- pending separate approval.
--
-- Singleton-row pattern: `id boolean primary key` combined with
-- `check (id)` (i.e. id = true) guarantees at most one row can ever
-- exist. This is the same class of database-level guarantee already used
-- elsewhere in this schema (e.g. course_offering_faculty's partial
-- unique index enforcing "at most one primary instructor per offering"),
-- applied here because application settings are inherently singleton —
-- there is exactly one active configuration, not a list of them.

create table public.system_settings (
  id boolean primary key default true,
  minimum_attendance_percentage numeric(5, 2) not null default 75.00
    check (minimum_attendance_percentage >= 0 and minimum_attendance_percentage <= 100),
  institution_timezone text not null default 'UTC',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint system_settings_is_singleton check (id)
);

comment on table public.system_settings is
  'Singleton settings row (see system_settings_is_singleton) holding exactly the two MVP settings approved in the Reports & System Settings analysis. Do not add columns for unapproved settings (grading scale, institution name, notice expiry, enrollment window, contact email, current semester) without separate approval.';
comment on column public.system_settings.minimum_attendance_percentage is
  'Policy threshold (0-100) used by attendance reporting to flag low attendance. No corresponding concept existed anywhere in the schema before this migration; 75.00 is a bootstrap default, immediately editable by management, not a claimed institutional policy.';
comment on column public.system_settings.institution_timezone is
  'IANA timezone identifier (e.g. "Asia/Karachi") for consistent date/time display. Validated at the application layer (Intl.supportedValuesOf("timeZone")) rather than a DB constraint or trigger — Postgres CHECK constraints cannot reference the system timezone-name catalog, and every other free-form input in this codebase is likewise validated in application code, not via a trigger (the attendance-integrity trigger in the initial migration is a data-consistency rule across foreign keys, a different class of problem, not a precedent for input-format validation).';
comment on column public.system_settings.updated_by is
  'Nullable / ON DELETE SET NULL, same historical-attribution pattern as notices.published_by, attendance.recorded_by, results.recorded_by: preserve the setting value even if the profile that last changed it is later removed.';

create trigger trg_system_settings_set_updated_at
  before update on public.system_settings
  for each row
  execute function public.set_updated_at();

insert into public.system_settings (id, minimum_attendance_percentage, institution_timezone)
values (true, 75.00, 'UTC');

alter table public.system_settings enable row level security;

-- Table-level GRANTs, matching the exact pattern every other table in
-- this schema already has (see supabase/migrations/20260813152648_
-- remote_schema.sql): delete/insert/select/update granted to anon,
-- authenticated, and service_role at the coarse-grained GRANT level, with
-- RLS then doing the actual fine-grained row-level restriction. Without
-- these, RLS policies never even get evaluated — Postgres denies the
-- operation earlier, at the GRANT check — which was confirmed locally
-- (see implementation report) before this block was added: the very
-- first version of this migration omitted the GRANTs and every write,
-- including as management, failed with "permission denied for table
-- system_settings" rather than an RLS-shaped denial.
grant delete on table "public"."system_settings" to "anon";
grant insert on table "public"."system_settings" to "anon";
grant select on table "public"."system_settings" to "anon";
grant update on table "public"."system_settings" to "anon";

grant delete on table "public"."system_settings" to "authenticated";
grant insert on table "public"."system_settings" to "authenticated";
grant select on table "public"."system_settings" to "authenticated";
grant update on table "public"."system_settings" to "authenticated";

grant delete on table "public"."system_settings" to "service_role";
grant insert on table "public"."system_settings" to "service_role";
grant select on table "public"."system_settings" to "service_role";
grant update on table "public"."system_settings" to "service_role";

-- Read: `using (true)` for any authenticated user — same visibility
-- level as every other reference/catalog table in this schema
-- (departments, programs, courses, semesters, timetables all use
-- `using (true)`). Settings like an attendance threshold or timezone are
-- institution-wide reference data, not sensitive, and no role-specific
-- restriction was requested.
create policy "system_settings_select_authenticated"
  on public.system_settings
  as permissive
  for select
  to authenticated
  using (true);

-- Write: management only, matching every other table's write-policy
-- pattern in this schema. No insert/delete policy is added — this is a
-- singleton row seeded once by this migration; the application only ever
-- needs to read and update it, and Postgres RLS default-denies any
-- operation with no matching policy, so insert/delete are correctly
-- blocked for every role, including management.
create policy "system_settings_update_management"
  on public.system_settings
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));
