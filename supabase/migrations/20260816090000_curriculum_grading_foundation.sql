-- Phase 8B — curriculum requirements, grading scale, and immutable result
-- history. Foundation tables only: no curriculum/grading data is seeded
-- here (per explicit instruction — the supplied course lists are not
-- degree-requirement rules, and no institutional grading scale has been
-- supplied). See docs/database-design.md Phase 8B addendum for full
-- rationale.

-- ============================================================
-- 1. curriculum_requirements
-- ============================================================
--
-- Normalizes "what does this program/specialization actually require",
-- distinct from program_courses (which stays as-is: a plain
-- program-to-course catalog membership with only an is_elective flag —
-- see docs/database-design.md v3 §12 on why course_type was removed from
-- it rather than extended). A row here is either:
--   (a) a specific-course requirement (course_id set, required_credit_hours
--       null) — "this exact course is required/available", or
--   (b) a category-level credit requirement (course_id null,
--       required_credit_hours set) — "N credit hours of this category are
--       required, from whichever courses satisfy it".
-- The CHECK constraint below makes that distinction unspoofable at the
-- database level, per explicit instruction that the UI/data model must
-- not imply a course list automatically represents degree requirements.

create table public.curriculum_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete restrict,
  specialization_id uuid references public.specializations (id) on delete restrict,
  course_id uuid references public.courses (id) on delete restrict,
  requirement_category text not null check (requirement_category in (
    'general', 'major', 'elective', 'seminar', 'project', 'thesis_research'
  )),
  required_credit_hours numeric(3, 1) check (required_credit_hours > 0),
  recommended_semester integer check (recommended_semester > 0),
  is_mandatory boolean not null default true,
  applicable_entry_basis text check (applicable_entry_basis in ('ms_mphil_llm', 'bs_master')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint curriculum_requirements_course_or_category_ch check (
    course_id is null or required_credit_hours is null
  )
);

create index idx_curriculum_requirements_program_id on public.curriculum_requirements (program_id);
create index idx_curriculum_requirements_specialization_id on public.curriculum_requirements (specialization_id);
create index idx_curriculum_requirements_course_id on public.curriculum_requirements (course_id);
create index idx_curriculum_requirements_category on public.curriculum_requirements (requirement_category);

comment on table public.curriculum_requirements is
  'Normalized degree-requirement rules per program (optionally scoped to a specialization and/or PhD entry-basis track). NOT seeded with data in Phase 8B — the supplied course lists are source catalogs, not confirmed requirement rules (see docs/database-design.md Phase 8B addendum). program_courses is unchanged and continues to serve as the plain program-to-course catalog link; this table adds the requirement semantics program_courses was never designed to carry.';
comment on column public.curriculum_requirements.specialization_id is
  'NULL = applies to every specialization within the program. Non-null scopes the requirement to one specialization. Same nullable-scoping convention as milestone_templates.applicable_entry_basis and document_requirements.';
comment on column public.curriculum_requirements.course_id is
  'NULL = this is a category-level credit-hour requirement (see required_credit_hours), not tied to one course. Non-null = this specific course is the requirement (required_credit_hours must then be null — see the course_or_category_ch check).';
comment on column public.curriculum_requirements.required_credit_hours is
  'Only meaningful when course_id is null (a category quota, e.g. "6 CH of electives"). A specific-course requirement (course_id set) derives its credit hours from courses.credit_hours instead, so this column stays null there — enforced by curriculum_requirements_course_or_category_ch.';
comment on column public.curriculum_requirements.applicable_entry_basis is
  'NULL = applies regardless of PhD entry basis. Non-null distinguishes the two parallel PhD coursework tracks (e.g. 24 vs 48 CH), same vocabulary and convention as students.phd_entry_basis / milestone_templates.applicable_entry_basis. Meaningless for non-PhD programs, left null.';
comment on constraint curriculum_requirements_course_or_category_ch on public.curriculum_requirements is
  'A row names either a specific course OR carries a category-level credit-hour target, never both — this is what lets the UI (and any future degree-audit logic) distinguish "GEOL-xxx is required" from "6 CH of electives are required" unambiguously.';
comment on table public.curriculum_requirements is
  E'@ambiguity: no UNIQUE constraint is imposed (e.g. on (program_id, specialization_id, course_id)) because specialization_id/course_id are nullable and Postgres unique indexes treat each NULL as distinct — a plain UNIQUE would not actually prevent duplicate category-level rows (specialization_id null) for the same program+category, nor is it clear duplicates should always be forbidden (two different category rows for the same program/null-specialization but different requirement_category are legitimate). Left unenforced and documented per explicit instruction rather than guessed; revisit with an expression/partial unique index once real usage patterns are known.';

create trigger trg_curriculum_requirements_set_updated_at
  before update on public.curriculum_requirements
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 2. grading_scale
-- ============================================================
--
-- A configurable reference table for translating results.marks into a
-- letter grade / grade point. NOT seeded with an actual scale in Phase
-- 8B — no institutional grading policy has been supplied, and
-- results.grade_point has always been intentionally left unbound (see
-- docs/database-design.md v3 "No grading-scale bound is imposed").

create extension if not exists btree_gist;

create table public.grading_scale (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_marks numeric(5, 2) not null check (min_marks >= 0),
  max_marks numeric(5, 2) not null,
  letter_grade text not null,
  grade_point numeric(3, 2) not null check (grade_point >= 0),
  is_passing boolean not null default true,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grading_scale_max_gt_min check (max_marks > min_marks)
);

create index idx_grading_scale_status on public.grading_scale (status);

-- Prevents two ACTIVE bands from covering an overlapping mark range.
-- Scoped to status = 'active' (a partial exclusion constraint) so a
-- deactivated/superseded band can coexist with its replacement rather
-- than blocking the replacement from being created — matches the
-- activate/deactivate lifecycle the same way other catalog tables in this
-- schema use a status flag instead of deletion.
alter table public.grading_scale
  add constraint grading_scale_no_overlap_active
  exclude using gist (numrange(min_marks, max_marks, '[]') with &&)
  where (status = 'active');

comment on table public.grading_scale is
  'Configurable institutional grading scale (marks range -> letter grade -> grade point). Deliberately not seeded in Phase 8B — no University of Peshawar/NCEG grading policy has been supplied; a generic 4.0-style scale must not be assumed. Management configures the real scale via /management/grading-scale once confirmed.';
comment on column public.grading_scale.name is
  'Human-readable label for the band (e.g. "Excellent"), independent of letter_grade (the short code, e.g. "A"). Both are free text — no fixed vocabulary, since the actual scale is institution-defined.';
comment on constraint grading_scale_no_overlap_active on public.grading_scale is
  'Exclusion constraint (requires btree_gist): no two rows with status=''active'' may have overlapping [min_marks, max_marks] ranges. Deactivated rows are exempt so a superseded band does not block its replacement.';

create trigger trg_grading_scale_set_updated_at
  before update on public.grading_scale
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 3. result_revisions
-- ============================================================
--
-- Immutable history of every change made to a results row after its
-- initial creation. A published academic result is a significant
-- institutional record; this ensures it can never be silently
-- overwritten, at the database level, regardless of which code path
-- performs the update (this Server Action, a future grade-entry Server
-- Action, or a direct SQL statement run by an administrator).

create table public.result_revisions (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results (id) on delete restrict,
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  previous_marks numeric(5, 2),
  previous_grade text,
  previous_grade_point numeric(3, 2),
  new_marks numeric(5, 2),
  new_grade text,
  new_grade_point numeric(3, 2),
  changed_by uuid references public.profiles (id) on delete set null,
  changed_at timestamptz not null default now(),
  reason text
);

create index idx_result_revisions_result_id on public.result_revisions (result_id);
create index idx_result_revisions_enrollment_id on public.result_revisions (enrollment_id);
create index idx_result_revisions_changed_at on public.result_revisions (changed_at);

comment on table public.result_revisions is
  'Append-only. No UPDATE/DELETE RLS policy exists for this table at all (see the RLS migration) — immutability is enforced structurally, not by convention or application discipline. Rows are inserted exclusively by trg_results_record_revision; nothing in application code ever inserts here directly, so the trigger is the single source of truth for what counts as a revision.';
comment on column public.result_revisions.enrollment_id is
  'Denormalized copy of results.enrollment_id (results.enrollment_id is UNIQUE, so this is always in 1:1 correspondence with result_id) — kept as its own column purely so a revision history for one enrollment can be queried without joining back through results first. Always set from the result row itself by the trigger, never trusted from a caller.';
comment on column public.result_revisions.reason is
  'Optional free-text reason for the change. Populated from the session-local `app.result_change_reason` setting if the caller set one via set_config(..., true) before the UPDATE; null otherwise. No caller sets this yet in Phase 8B (there is no grade-entry UI) — wired up for the Phase 8D grade-entry workflow to use without a further trigger change.';

-- changed_by is captured via auth.uid() inside the trigger (see function
-- below) rather than accepted as an input column on `results` — this
-- means the attribution cannot be spoofed by whatever calls UPDATE on
-- results, the same reasoning already applied to milestone_sync's use of
-- profile.id from requireRole() rather than a client-supplied value,
-- just enforced one level deeper (in the database itself).
create function public.record_result_revision()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.marks is distinct from old.marks
     or new.grade is distinct from old.grade
     or new.grade_point is distinct from old.grade_point then
    insert into public.result_revisions (
      result_id, enrollment_id,
      previous_marks, previous_grade, previous_grade_point,
      new_marks, new_grade, new_grade_point,
      changed_by, reason
    ) values (
      old.id, old.enrollment_id,
      old.marks, old.grade, old.grade_point,
      new.marks, new.grade, new.grade_point,
      auth.uid(),
      nullif(current_setting('app.result_change_reason', true), '')
    );
  end if;
  return new;
end;
$$;

comment on function public.record_result_revision() is
  'AFTER UPDATE trigger function on results: inserts a result_revisions row only when marks/grade/grade_point actually changed (a metadata-only update, e.g. remarks, does not create a revision). SECURITY DEFINER so the insert into result_revisions always succeeds regardless of the calling role''s own RLS grants on that table, avoiding a scenario where an authorized results UPDATE fails because of an unrelated RLS mismatch on result_revisions.';

create trigger trg_results_record_revision
  after update on public.results
  for each row
  execute function public.record_result_revision();

comment on trigger trg_results_record_revision on public.results is
  'Fires on every UPDATE to results, from any code path. Never fires on INSERT (a new result has no "previous" state to record). This is the sole mechanism by which result_revisions rows are created — see docs/database-design.md Phase 8B addendum.';
