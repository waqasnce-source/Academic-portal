-- Academic Portal — Phase 3: Academic progress / student-milestone system
--
-- Additive only. Does not drop, rename, or destructively alter any existing
-- table. The two relaxations below (faculty.profile_id, faculty.employee_number)
-- are constraint *relaxations* (NOT NULL -> nullable), not destructive changes,
-- and are required to satisfy explicit Phase 3 instructions — see the comments
-- at each ALTER for the exact reasoning.
--
-- Reuses public.departments as the discipline structure (no separate
-- disciplines table, per explicit instruction), and reuses profiles,
-- students, faculty, programs, semesters as-is.
--
-- Two schema additions beyond the literal column lists given in the Phase 3
-- brief were necessary to actually encode the supplied academic rules; both
-- are called out inline and in the Phase 3 report:
--   1. milestone_templates.applicable_entry_basis + students.phd_entry_basis
--      — the brief describes two parallel PhD timing tracks depending on
--      whether the scholar was admitted on an MS/MPhil/LLM basis or a
--      BS/Master basis, but gave no column to distinguish them.
--   2. milestone_templates.target_days_after_prerequisite — the brief
--      requires "comprehensive exam within 3 months of coursework
--      completion" and "second exam within 3 months of the first", which is
--      relative to a *prerequisite milestone's completion*, not to
--      admission (the only relative-date column given was
--      target_days_after_admission).
--
-- A shared, reused (not per-table invented) progress-status vocabulary —
-- the exact 11 values given for student_milestones.status — is reused
-- verbatim on research_proposals.gsc_status/asrb_status, thesis_records.status,
-- thesis_corrections.status, and document_submissions.status, instead of
-- inventing a separate vocabulary for each. Columns with no vocabulary
-- supplied anywhere in the brief (research_projects.status,
-- thesis_reviewers.status, thesis_records.clearance_status,
-- viva_examinations.status/result, result_declarations.status/
-- examiner_fee_status/transcript_status) are left as unconstrained text —
-- deliberately not guessing an academic vocabulary that was never supplied.

-- ============================================================
-- 0. Relaxations to existing tables (additive-in-spirit; both required by
--    explicit Phase 3 instructions; neither drops data or narrows anything)
-- ============================================================

-- faculty.profile_id NULLABLE — required so the NCEG faculty roster (§2 of
-- the Phase 3 brief) can be represented before any Supabase Auth account
-- exists for a given faculty member. Explicitly instructed: "Do NOT create
-- Auth accounts for faculty at this stage."
alter table public.faculty
  alter column profile_id drop not null;

-- faculty.department_id NULLABLE — explicitly instructed: "Do not infer
-- discipline/specialization for faculty unless it already exists...
-- Create nullable fields so this can be assigned later." Several roster
-- entries (e.g. Professor Emeritus, Research Associates) have no
-- department stated in the supplied roster.
alter table public.faculty
  alter column department_id drop not null;

-- faculty.employee_number NULLABLE — not part of the supplied NCEG roster
-- data at all. The Phase 3 brief's faculty column list omits it entirely
-- and explicitly says "Do not fabricate missing... information", so
-- fabricating employee numbers to satisfy the old NOT NULL would violate
-- that instruction directly. Relaxed to nullable; UNIQUE is preserved
-- (Postgres allows multiple NULLs under a plain UNIQUE constraint, so this
-- does not weaken uniqueness for rows that do have a number).
alter table public.faculty
  alter column employee_number drop not null;

-- faculty.name — the roster's primary identity field for faculty who have
-- no profile_id (and thus no profiles.full_name to join to). The table is
-- confirmed empty (0 rows) as of this migration, so NOT NULL is safe to add
-- directly with no backfill.
alter table public.faculty
  add column name text not null;

-- faculty.email — nullable, free text. Distinct from profiles.email (which
-- only exists once a real Auth account/profile is provisioned). Not
-- unique-constrained: most roster entries have no email at all ("Do not
-- fabricate missing emails"), and enforcing uniqueness over a mostly-NULL,
-- externally-supplied contact field was not requested.
alter table public.faculty
  add column email text;

comment on column public.faculty.name is
  'Roster display name. Authoritative when profile_id is null (no Supabase Auth account yet). Once profile_id is set, application code should prefer profiles.full_name (same precedence convention as profiles.email vs auth.users.email), but no trigger enforces this — it is a display-precedence rule, not a data-integrity rule.';
comment on column public.faculty.email is
  'Roster contact email, independent of profiles.email / auth.users.email. Nullable and not unique — most roster entries have no email supplied.';
comment on column public.faculty.profile_id is
  'Nullable as of Phase 3: a faculty roster entry may exist with no linked Supabase Auth account. Set only once the person is actually provisioned a login (out of scope for this migration — see Phase 3 report).';
comment on column public.faculty.department_id is
  'Nullable as of Phase 3: several roster entries have no stated department/discipline. Left null rather than guessed.';
comment on column public.faculty.employee_number is
  'Nullable as of Phase 3: the supplied NCEG roster does not include employee numbers. UNIQUE constraint retained for rows that do have one.';

-- ============================================================
-- 1. specializations
-- ============================================================
--
-- Scoped to a department (reused as "discipline" per explicit instruction —
-- no separate disciplines table). A specialization with department_id
-- pointing at Geol (the PGD/general-courses department) is not expected
-- under the supplied curriculum, but is not prevented — no CHECK ties
-- specializations to only the 3 disciplines that have supplied
-- specializations, since that would hard-code a business rule not asked
-- for.

create table public.specializations (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  code text unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

create index idx_specializations_department_id on public.specializations (department_id);
create index idx_specializations_is_active on public.specializations (is_active);

comment on table public.specializations is
  'Optional third-level academic categorization below department (reused as discipline) and program: e.g. Geophysics -> Hydrogeophysics. A student may optionally have one via students.specialization_id.';

create trigger trg_specializations_set_updated_at
  before update on public.specializations
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 2. students: optional specialization + PhD entry-basis
-- ============================================================

alter table public.students
  add column specialization_id uuid references public.specializations (id) on delete restrict;

create index idx_students_specialization_id on public.students (specialization_id);

comment on column public.students.specialization_id is
  'Optional. Nullable — not every program/student has (or needs) a specialization, e.g. PGD students.';

-- phd_entry_basis distinguishes the two parallel PhD timing tracks
-- described in the Phase 3 brief (§6): coursework/supervisor/research-topic
-- deadlines differ depending on whether the scholar was admitted on an
-- MS/MPhil/LLM basis or a BS/Master basis. No column for this existed
-- anywhere in the schema or in the brief's own column lists; without it,
-- milestone_templates has no way to represent two different deadline sets
-- for the same PhD milestone. See migration header note.
alter table public.students
  add column phd_entry_basis text check (phd_entry_basis in ('ms_mphil_llm', 'bs_master'));

comment on column public.students.phd_entry_basis is
  'Only meaningful for PhD students. Distinguishes which of the two supplied PhD timing tracks (admitted on MS/MPhil/LLM vs admitted on BS/Master) applies when the status engine evaluates milestone_templates.applicable_entry_basis. Null for non-PhD students. Added beyond the brief''s literal students column list — see migration header note.';

-- ============================================================
-- 3. supervisor_assignments
-- ============================================================
--
-- status uses the same two-value active/inactive vocabulary already used
-- throughout this schema (departments.status, faculty.status, etc.) rather
-- than inventing a new one. "Only one active primary supervisor should
-- normally exist" is enforced the same way course_offering_faculty enforces
-- "at most one primary instructor": a partial unique index, not a CHECK
-- (CHECK cannot see other rows). Historical assignments are never deleted —
-- changing supervisor means inserting a new row and setting the old row's
-- status to 'inactive' (with end_date), which the RLS/application layer
-- will do, not a DB trigger (no instruction asked for automatic
-- supersession, so it is not hard-coded here).

create table public.supervisor_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  role text not null default 'supervisor' check (role in ('supervisor', 'co_supervisor')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_date date not null default current_date,
  start_date date,
  end_date date check (end_date is null or start_date is null or end_date >= start_date),
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_supervisor_assignments_student_id on public.supervisor_assignments (student_id);
create index idx_supervisor_assignments_faculty_id on public.supervisor_assignments (faculty_id);
create index idx_supervisor_assignments_status on public.supervisor_assignments (status);

-- At most one ACTIVE 'supervisor' (primary) role per student. Does not
-- restrict co_supervisor count, and does not restrict how many *inactive*
-- (historical) supervisor rows a student may have.
create unique index uq_supervisor_assignments_one_active_supervisor
  on public.supervisor_assignments (student_id)
  where role = 'supervisor' and status = 'active';

comment on table public.supervisor_assignments is
  'Preserves full supervisor history — a supervisor change is a new row plus marking the old row inactive, never a delete/overwrite. Faculty read access (own supervisees only) and the faculty-scoped write pattern on student_milestones are both derived from this table.';
comment on index public.uq_supervisor_assignments_one_active_supervisor is
  'Enforces "only one active primary supervisor should normally exist" from the Phase 3 brief. Partial unique index (same technique as course_offering_faculty''s single-primary-instructor constraint), since a CHECK constraint cannot see other rows.';

create trigger trg_supervisor_assignments_set_updated_at
  before update on public.supervisor_assignments
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 4. milestone_templates
-- ============================================================

create table public.milestone_templates (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs (id) on delete restrict,
  degree_level text not null check (degree_level in ('diploma', 'bachelor', 'master', 'phd')),
  applicable_entry_basis text check (applicable_entry_basis in ('ms_mphil_llm', 'bs_master')),
  milestone_code text not null,
  title text not null,
  description text,
  sequence_no integer not null check (sequence_no > 0),
  required boolean not null default true,
  target_semester integer check (target_semester > 0),
  target_days_after_admission integer check (target_days_after_admission > 0),
  target_days_after_prerequisite integer check (target_days_after_prerequisite > 0),
  prerequisite_milestone_id uuid references public.milestone_templates (id) on delete restrict,
  category text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (degree_level, milestone_code, applicable_entry_basis)
);

create index idx_milestone_templates_program_id on public.milestone_templates (program_id);
create index idx_milestone_templates_degree_level on public.milestone_templates (degree_level);
create index idx_milestone_templates_prerequisite_milestone_id on public.milestone_templates (prerequisite_milestone_id);
create index idx_milestone_templates_is_active on public.milestone_templates (is_active);

comment on table public.milestone_templates is
  'Configurable degree-completion roadmap. program_id null = applies to every program at that degree_level (used for all seeded MS/MPhil and PhD templates, since the supplied NCEG work plan rules are uniform across programs at a given degree level, not per-program). Deadlines are data here, never hard-coded in application code, per explicit Phase 3 instruction.';
comment on column public.milestone_templates.applicable_entry_basis is
  'Null = applies regardless of entry basis (used for every MS/MPhil template, and PhD templates whose timing does not depend on entry basis). Non-null distinguishes the two parallel PhD timing tracks in the Phase 3 brief. See migration header note — this column was not in the brief''s literal column list but is required to encode the supplied dual-track PhD rules.';
comment on column public.milestone_templates.target_days_after_prerequisite is
  'Relative deadline measured from the prerequisite milestone''s completion date (e.g. "comprehensive exam within 3 months of coursework completion"), distinct from target_days_after_admission which is measured from admission. See migration header note.';

create trigger trg_milestone_templates_set_updated_at
  before update on public.milestone_templates
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 5. student_milestones
-- ============================================================

create table public.student_milestones (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  milestone_template_id uuid not null references public.milestone_templates (id) on delete restrict,
  status text not null default 'not_started' check (status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  planned_date date,
  due_date date,
  completed_date date,
  verified_date date,
  verified_by uuid references public.profiles (id) on delete set null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, milestone_template_id)
);

create index idx_student_milestones_student_id on public.student_milestones (student_id);
create index idx_student_milestones_milestone_template_id on public.student_milestones (milestone_template_id);
create index idx_student_milestones_status on public.student_milestones (status);
create index idx_student_milestones_due_date on public.student_milestones (due_date);

comment on table public.student_milestones is
  'One row per (student, milestone_template) once applicable. The "overdue" status value is available for explicit use (e.g. a future scheduled job, or manual correction), but lib/academic/status-engine.ts computes overdue-ness dynamically from due_date vs. today() rather than trusting a possibly-stale stored value — see Phase 3 report.';
comment on column public.student_milestones.verified_by is
  'References profiles, not faculty directly, so either a management user or a faculty member (via their own profile) can be recorded as the verifier. ON DELETE SET NULL: same historical-attribution pattern as attendance.recorded_by / results.recorded_by.';

create trigger trg_student_milestones_set_updated_at
  before update on public.student_milestones
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 6. research_projects
-- ============================================================

create table public.research_projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  title text not null,
  abstract text,
  research_area text,
  supervisor_id uuid references public.faculty (id) on delete set null,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_research_projects_student_id on public.research_projects (student_id);
create index idx_research_projects_supervisor_id on public.research_projects (supervisor_id);

comment on table public.research_projects is
  'supervisor_id is a descriptive convenience copy of the project''s declared supervisor; the authoritative access-control source for "who supervises this student" is supervisor_assignments, not this column (a student can have a co-supervisor not reflected here).';
comment on column public.research_projects.status is
  'No vocabulary was supplied for this field in the Phase 3 brief; left unconstrained rather than inventing an academic-lifecycle vocabulary.';

create trigger trg_research_projects_set_updated_at
  before update on public.research_projects
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 7. research_proposals
-- ============================================================
--
-- gsc_status / asrb_status reuse the exact student_milestones.status
-- vocabulary (not a new one) — see migration header note.

create table public.research_proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.research_projects (id) on delete restrict,
  version integer not null default 1 check (version > 0),
  gsc_status text check (gsc_status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  gsc_date date,
  gsc_comments text,
  asrb_status text check (asrb_status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  asrb_date date,
  asrb_comments text,
  corrected_submission_date date,
  approval_date date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create index idx_research_proposals_project_id on public.research_proposals (project_id);

comment on table public.research_proposals is
  'Versioned per project (unique (project_id, version)) so proposal history is preserved rather than overwritten — a new corrected proposal is a new row, not an update to the prior version. One table covers both GSC and ASRB stages (paired status/date/comments columns) rather than two separate tables, per explicit instruction not to duplicate unless genuinely necessary.';

create trigger trg_research_proposals_set_updated_at
  before update on public.research_proposals
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 8. document_requirements
-- ============================================================

create table public.document_requirements (
  id uuid primary key default gen_random_uuid(),
  milestone_template_id uuid references public.milestone_templates (id) on delete restrict,
  document_name text not null,
  description text,
  required boolean not null default true,
  degree_level text check (degree_level in ('diploma', 'bachelor', 'master', 'phd')),
  program_id uuid references public.programs (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_document_requirements_milestone_template_id on public.document_requirements (milestone_template_id);
create index idx_document_requirements_program_id on public.document_requirements (program_id);
create index idx_document_requirements_degree_level on public.document_requirements (degree_level);

comment on table public.document_requirements is
  'Configurable catalog of what documents a milestone/program/degree level requires. No created_at-only tables elsewhere lack updated_at by convention (notices/notifications) — this table is likewise treated as append/reconfigure-by-replacement rather than in-place-edited, so no updated_at trigger.';

-- ============================================================
-- 9. document_submissions
-- ============================================================
--
-- Files live in Supabase Storage; file_path is a reference only, per
-- explicit instruction not to store large files in Postgres. status reuses
-- the shared progress vocabulary (fits the submit -> review -> approve /
-- corrections-required lifecycle well).

create table public.document_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  document_requirement_id uuid not null references public.document_requirements (id) on delete restrict,
  milestone_id uuid references public.student_milestones (id) on delete set null,
  file_path text not null,
  original_filename text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'submitted' check (status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_document_submissions_student_id on public.document_submissions (student_id);
create index idx_document_submissions_document_requirement_id on public.document_submissions (document_requirement_id);
create index idx_document_submissions_milestone_id on public.document_submissions (milestone_id);
create index idx_document_submissions_status on public.document_submissions (status);

comment on column public.document_submissions.file_path is
  'Reference into Supabase Storage (bucket/object path), never a file payload — no large-object or bytea column exists on this table by design.';
comment on column public.document_submissions.milestone_id is
  'Optional link to the specific student_milestones row this submission satisfies. ON DELETE SET NULL: the submission record is independently meaningful even if the milestone instance is later removed.';

create trigger trg_document_submissions_set_updated_at
  before update on public.document_submissions
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 10. extension_applications
-- ============================================================

create table public.extension_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  application_date date not null default current_date,
  current_semester integer check (current_semester > 0),
  requested_extension_semesters integer check (requested_extension_semesters > 0),
  requested_from date,
  requested_to date check (requested_to is null or requested_from is null or requested_to >= requested_from),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  recommendation text,
  approval_date date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_extension_applications_student_id on public.extension_applications (student_id);
create index idx_extension_applications_status on public.extension_applications (status);

comment on table public.extension_applications is
  'The Phase 3 brief is explicit that the status engine must consider approved extensions when evaluating overdue milestones, but must NOT automatically mark a student overdue solely from semester count — see lib/academic/status-engine.ts.';

create trigger trg_extension_applications_set_updated_at
  before update on public.extension_applications
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 11. thesis_records
-- ============================================================
--
-- status reuses the shared progress vocabulary. clearance_status is left
-- unconstrained — no vocabulary was supplied for it.

create table public.thesis_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  research_project_id uuid references public.research_projects (id) on delete restrict,
  submission_date date,
  thesis_title text,
  status text check (status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  plagiarism_certificate_path text,
  clearance_status text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_thesis_records_student_id on public.thesis_records (student_id);
create index idx_thesis_records_research_project_id on public.thesis_records (research_project_id);

comment on column public.thesis_records.plagiarism_certificate_path is
  'Reference into Supabase Storage, same convention as document_submissions.file_path — not a file payload.';

create trigger trg_thesis_records_set_updated_at
  before update on public.thesis_records
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 12. thesis_reviewers
-- ============================================================

create table public.thesis_reviewers (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.thesis_records (id) on delete restrict,
  reviewer_name text not null,
  reviewer_type text not null check (reviewer_type in ('foreign', 'national')),
  affiliation text,
  country text,
  email text,
  status text,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_thesis_reviewers_thesis_id on public.thesis_reviewers (thesis_id);
create index idx_thesis_reviewers_reviewer_type on public.thesis_reviewers (reviewer_type);

create trigger trg_thesis_reviewers_set_updated_at
  before update on public.thesis_reviewers
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 13. thesis_reviews
-- ============================================================

create table public.thesis_reviews (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.thesis_records (id) on delete restrict,
  reviewer_id uuid not null references public.thesis_reviewers (id) on delete restrict,
  received_date date,
  recommendation text,
  comments text,
  report_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_thesis_reviews_thesis_id on public.thesis_reviews (thesis_id);
create index idx_thesis_reviews_reviewer_id on public.thesis_reviews (reviewer_id);

comment on column public.thesis_reviews.report_path is
  'Reference into Supabase Storage, same convention as document_submissions.file_path.';

create trigger trg_thesis_reviews_set_updated_at
  before update on public.thesis_reviews
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 14. thesis_corrections
-- ============================================================
--
-- status reuses the shared progress vocabulary.

create table public.thesis_corrections (
  id uuid primary key default gen_random_uuid(),
  thesis_id uuid not null references public.thesis_records (id) on delete restrict,
  submitted_date date,
  correction_certificate_path text,
  reply_to_comments_path text,
  status text check (status in (
    'not_started', 'pending', 'in_progress', 'submitted', 'under_review',
    'approved', 'corrections_required', 'completed', 'overdue', 'waived',
    'not_applicable'
  )),
  approved_date date,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_thesis_corrections_thesis_id on public.thesis_corrections (thesis_id);

create trigger trg_thesis_corrections_set_updated_at
  before update on public.thesis_corrections
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 15. viva_examinations
-- ============================================================

create table public.viva_examinations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  thesis_id uuid references public.thesis_records (id) on delete restrict,
  scheduled_date date,
  actual_date date,
  status text,
  result text,
  examiner_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_viva_examinations_student_id on public.viva_examinations (student_id);
create index idx_viva_examinations_thesis_id on public.viva_examinations (thesis_id);

comment on column public.viva_examinations.status is
  'No vocabulary supplied (e.g. scheduled/completed/postponed); left unconstrained.';
comment on column public.viva_examinations.result is
  'No vocabulary supplied (e.g. pass/fail/referred); left unconstrained rather than inventing an examination-outcome vocabulary.';

create trigger trg_viva_examinations_set_updated_at
  before update on public.viva_examinations
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 16. result_declarations
-- ============================================================
--
-- The five checklist-style fields are modeled as booleans (a natural,
-- minimal, non-invented type choice for a yes/no clearance gate); the two
-- fields that plausibly need more than two states (examiner_fee_status,
-- transcript_status) and the overall status are left as unconstrained text.

create table public.result_declarations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  declaration_date date,
  status text,
  clearance_uop boolean not null default false,
  clearance_nceg boolean not null default false,
  library_submission boolean not null default false,
  it_submission boolean not null default false,
  secrecy_submission boolean not null default false,
  examiner_fee_status text,
  transcript_status text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_result_declarations_student_id on public.result_declarations (student_id);

create trigger trg_result_declarations_set_updated_at
  before update on public.result_declarations
  for each row
  execute function public.set_updated_at();
