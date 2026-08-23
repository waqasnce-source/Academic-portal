-- Academic catalogue / curriculum implementation, per NCEG-supplied
-- program, specialization, course, and requirement data.
--
-- Per explicit instruction, this does NOT introduce a parallel schema
-- (disciplines/degree_programs/academic_milestones). Every genuinely-new
-- concept maps onto existing, already-designed infrastructure instead:
--   disciplines        -> departments (unchanged since Phase 3's decision)
--   degree_programs     -> programs (unchanged shape, new rows)
--   specializations      -> specializations (unchanged shape, new rows)
--   program_requirements -> curriculum_requirements (unchanged shape, new rows)
--   academic_milestones   -> milestone_templates (already covers this --
--     see migration comment below for the specific overlap found)
-- The only two schema changes below are what's genuinely missing:
-- programs.duration_years relaxed to nullable (no source-confirmed
-- duration exists for any program yet, and NOT NULL would force
-- inventing one), and a new catalogue_notes table (no existing mechanism
-- records source-data anomalies without altering the source data itself).

-- ============================================================
-- 1. programs.duration_years -> nullable, + duration_verified flag
-- ============================================================
--
-- Was NOT NULL. The supplied NCEG material gives coursework/milestone
-- timing (e.g. "coursework normally completed within 2-3 semesters") but
-- never an actual total program duration in years for either degree
-- level. Forcing a value here would mean inventing one, which was
-- explicitly ruled out. duration_verified defaults false so an
-- unconfirmed-but-technically-non-null value (should one ever be entered
-- speculatively) is still visibly distinguishable from a confirmed one --
-- though the immediate intent is for duration_years to stay NULL until
-- an administrator enters and verifies the real figure.

alter table public.programs
  alter column duration_years drop not null;

alter table public.programs
  add column duration_verified boolean not null default false;

comment on column public.programs.duration_years is
  'Nullable: no source-confirmed program duration exists for any program as of the academic-catalogue phase. NULL means "not yet entered", not zero or unknown-but-irrelevant.';
comment on column public.programs.duration_verified is
  'True only once an administrator has confirmed duration_years against an official NCEG/University of Peshawar regulation. Defaults false, including for any non-null value entered before verification.';

-- ============================================================
-- 2. catalogue_notes -- source-data anomaly / verification tracking
-- ============================================================
--
-- The supplied course catalogue contains internal inconsistencies (e.g.
-- Geol.706 given two different titles across two source lists; Geol.704
-- sharing a title with the already-seeded Geol.500 under a different
-- code and credit-hour count; Geop.833 appearing inside the Geology
-- Ph.D. course list despite its Geophysics code prefix; several
-- "Seminar" entries whose credit hours are given as a range rather than
-- a single value). Per explicit instruction, none of these are silently
-- corrected, merged, or resolved by inference -- this table is where
-- they are recorded instead, reviewable and eventually closeable by
-- management, without ever touching the source values that generated
-- the flag.
--
-- entity_type is deliberately generic (not courses-only): the PhD
-- 24-vs-48 coursework credit-hour ambiguity is a curriculum_requirements
-- -level issue, not a course-level one, and reuses this same mechanism
-- rather than inventing a second one.

create table public.catalogue_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('course', 'curriculum_requirement', 'program', 'specialization')),
  entity_reference text not null,
  course_id uuid references public.courses(id) on delete set null,
  issue_summary text not null,
  source_detail text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.catalogue_notes is
  'Records source-data anomalies (conflicting course codes/titles, unresolved credit-hour rules, unverified program durations, etc.) for administrator review, without ever silently correcting the underlying record. course_id is set only when the note concerns a course that actually exists as a row; entity_reference is always human-readable (e.g. a course code, or "All 4 Ph.D. programs") regardless.';

create index catalogue_notes_status_idx on public.catalogue_notes(status);
create index catalogue_notes_course_id_idx on public.catalogue_notes(course_id);
