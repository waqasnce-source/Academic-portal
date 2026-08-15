-- Academic Portal — Phase 6: students.profile_id nullable
--
-- Mirrors the exact precedent set for faculty.profile_id in
-- supabase/migrations/20260814180000_academic_progress_tracking.sql: a
-- constraint relaxation (NOT NULL -> nullable), not a destructive change.
--
-- Why this is required: students.profile_id is NOT NULL UNIQUE, so a
-- students row cannot exist without a Supabase Auth account + profiles
-- row already existing. There is no signup flow in this app and no
-- SUPABASE_SERVICE_ROLE_KEY configured (checked .env.local) to build an
-- admin-invite flow, so account provisioning cannot be built right now.
-- Without this relaxation, Management has no way to create a single
-- student record — the entire Phase 3-5 academic-progress system
-- (milestones, documents, extensions, thesis, supervisor assignments)
-- remains permanently unusable with real data, since it all keys off
-- students.id.
--
-- profile_id remains linkable later (once account provisioning exists,
-- an admin action can UPDATE students.profile_id to attach a real
-- account) — nothing about making it nullable prevents linking, it only
-- stops requiring it up front. UNIQUE is retained: two students can never
-- share one profile, and Postgres permits any number of NULLs under a
-- plain UNIQUE constraint, so this doesn't weaken that guarantee for rows
-- that do have a linked account.

alter table public.students
  alter column profile_id drop not null;

comment on column public.students.profile_id is
  'Nullable as of Phase 6, mirroring the identical faculty.profile_id relaxation in Phase 3: a student academic record may exist before any Supabase Auth account is provisioned for that person. Set (via a future admin "link account" action) once the person is actually provisioned a login. UNIQUE constraint retained.';

-- students.name / students.email — without these, a profile-less student
-- has no name anywhere in the system at all (student_number is a code,
-- not a person's name). Mirrors faculty.name/faculty.email exactly, added
-- for the identical reason in the same Phase 3 migration. The table is
-- confirmed empty (0 rows, verified live) so `name` can be added NOT NULL
-- directly with no backfill.

alter table public.students
  add column name text not null;

alter table public.students
  add column email text;

comment on column public.students.name is
  'Roster display name. Authoritative when profile_id is null (no Supabase Auth account yet). Once profile_id is set, application code should prefer profiles.full_name (same precedence convention as faculty.name vs profiles.full_name), but no trigger enforces this — a display-precedence rule, not a data-integrity rule.';
comment on column public.students.email is
  'Contact email, independent of profiles.email / auth.users.email. Nullable and not unique, same convention as faculty.email.';
