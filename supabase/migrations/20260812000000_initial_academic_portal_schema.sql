-- Academic Portal — Initial schema
--
-- Creates all 17 tables approved in docs/database-design.md (v3), plus
-- their foreign keys, CHECK/UNIQUE constraints, indexes, and the
-- attendance course-offering integrity trigger.
--
-- Explicitly OUT OF SCOPE for this migration (do not add here):
--   - Row Level Security policies (reviewed and implemented separately).
--   - Authentication (auth.users is Supabase-managed and already exists;
--     this migration only references it, never creates or alters it).
--   - Any application/UI change.
--
-- Table creation order below is dependency-safe (parents before
-- children) and follows the "Load order" note in
-- docs/database-design.md section 1, which differs from that
-- document's numbered table list (program_courses, for example, is
-- created only after both programs and courses exist).
--
-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase's Postgres
-- versions all satisfy this), so no extension needs to be enabled here.

-- ============================================================
-- 0. Shared trigger function: set_updated_at()
-- ============================================================
--
-- Reusable BEFORE UPDATE trigger function that stamps updated_at with the
-- current time on every row update. Attached below to every table that
-- has an updated_at column (all tables except notices and notifications,
-- which do not have one).
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'BEFORE UPDATE trigger function: sets NEW.updated_at = now() on every row update. Attached to every table with an updated_at column.';

-- ============================================================
-- 1. profiles
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'faculty', 'management')),
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles (role);
create index idx_profiles_status on public.profiles (status);

comment on table public.profiles is
  'One-to-one application profile for each Supabase Auth user (auth.users). Holds role and identity data common to every role; no academic data.';
comment on column public.profiles.email is
  'Application-level copy of auth.users.email, not a second source of truth. Kept here because RLS policies and PostgREST cannot read the auth schema directly, so self-access (and any broader management read policy added later) needs a queryable copy. Must be synchronized with auth.users.email by a trigger on auth.users once authentication is implemented (out of scope for this migration).';

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 2. departments
-- ============================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_departments_set_updated_at
  before update on public.departments
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 3. programs
-- ============================================================

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  code text not null unique,
  name text not null,
  degree_level text not null check (degree_level in ('diploma', 'bachelor', 'master', 'phd')),
  duration_years numeric(3, 1) not null check (duration_years > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_programs_department_id on public.programs (department_id);

create trigger trg_programs_set_updated_at
  before update on public.programs
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 4. faculty
-- ============================================================

create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  employee_number text not null unique,
  department_id uuid not null references public.departments (id) on delete restrict,
  designation text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_faculty_department_id on public.faculty (department_id);
create index idx_faculty_status on public.faculty (status);

create trigger trg_faculty_set_updated_at
  before update on public.faculty
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 5. students
-- ============================================================

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  student_number text not null unique,
  program_id uuid not null references public.programs (id) on delete restrict,
  admission_year integer not null check (admission_year between 2000 and 2100),
  status text not null default 'active' check (status in ('active', 'inactive', 'graduated', 'suspended', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_students_program_id on public.students (program_id);
create index idx_students_status on public.students (status);

comment on column public.students.status is
  'No current_semester column by design: academic history/progress is derived from enrollments, course_offerings, and semesters, never cached here.';

create trigger trg_students_set_updated_at
  before update on public.students
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 6. semesters
-- ============================================================

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  name text not null,
  start_date date not null,
  end_date date not null check (end_date > start_date),
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year, name)
);

create trigger trg_semesters_set_updated_at
  before update on public.semesters
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 7. courses
-- ============================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete restrict,
  code text not null unique,
  name text not null,
  credit_hours numeric(3, 1) not null check (credit_hours > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_courses_department_id on public.courses (department_id);
create index idx_courses_status on public.courses (status);

create trigger trg_courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 8. program_courses
-- ============================================================

create table public.program_courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete restrict,
  course_id uuid not null references public.courses (id) on delete restrict,
  recommended_semester integer check (recommended_semester > 0),
  is_elective boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, course_id)
);

create index idx_program_courses_program_id on public.program_courses (program_id);
create index idx_program_courses_course_id on public.program_courses (course_id);
create index idx_program_courses_recommended_semester on public.program_courses (recommended_semester);

comment on table public.program_courses is
  'Maps a course into a program''s curriculum (many-to-many between programs and courses). A course_type column was considered and deliberately omitted; is_elective is the only curriculum category in this version.';

create trigger trg_program_courses_set_updated_at
  before update on public.program_courses
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 9. course_offerings
-- ============================================================

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete restrict,
  semester_id uuid not null references public.semesters (id) on delete restrict,
  section text not null default 'A',
  capacity integer check (capacity > 0),
  status text not null default 'planned' check (status in ('planned', 'open', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, semester_id, section)
);

create index idx_course_offerings_semester_id on public.course_offerings (semester_id);
create index idx_course_offerings_course_id on public.course_offerings (course_id);
create index idx_course_offerings_status on public.course_offerings (status);

comment on table public.course_offerings is
  'A course taught in a specific semester/section. Has no faculty_id column: instructor assignment lives entirely in course_offering_faculty, so an offering may have zero, one, or several instructors.';

create trigger trg_course_offerings_set_updated_at
  before update on public.course_offerings
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 10. course_offering_faculty
-- ============================================================

create table public.course_offering_faculty (
  id uuid primary key default gen_random_uuid(),
  course_offering_id uuid not null references public.course_offerings (id) on delete restrict,
  faculty_id uuid not null references public.faculty (id) on delete restrict,
  role text not null default 'primary' check (role in ('primary', 'co_instructor', 'lab_instructor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_offering_id, faculty_id)
);

create index idx_course_offering_faculty_course_offering_id on public.course_offering_faculty (course_offering_id);
create index idx_course_offering_faculty_faculty_id on public.course_offering_faculty (faculty_id);

-- Enforces at most one 'primary' instructor per course offering. A course
-- offering with zero course_offering_faculty rows remains a valid "TBA"
-- state; this index only constrains what happens once a 'primary' row
-- exists, it does not require one.
create unique index uq_course_offering_faculty_one_primary
  on public.course_offering_faculty (course_offering_id)
  where role = 'primary';

comment on table public.course_offering_faculty is
  'Assigns one or more faculty members to a course offering (many-to-many). Zero rows for a given course_offering_id is valid and represents an unassigned (TBA) offering.';
comment on index public.uq_course_offering_faculty_one_primary is
  'Partial unique index: at most one row with role = ''primary'' per course_offering_id (at most one lead instructor). co_instructor and lab_instructor rows are unrestricted in count.';

create trigger trg_course_offering_faculty_set_updated_at
  before update on public.course_offering_faculty
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 11. course_sessions
-- ============================================================

create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_offering_id uuid not null references public.course_offerings (id) on delete restrict,
  class_date date not null,
  start_time time not null,
  end_time time not null check (end_time > start_time),
  room text,
  session_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_offering_id, class_date, start_time)
);

create index idx_course_sessions_course_offering_id on public.course_sessions (course_offering_id);
create index idx_course_sessions_class_date on public.course_sessions (class_date);

comment on table public.course_sessions is
  'Concrete, dated occurrences of a course offering. Attendance is recorded against these rows, not against timetables (an undated weekly template). Deliberately not linked to timetables by a foreign key in this version.';

create trigger trg_course_sessions_set_updated_at
  before update on public.course_sessions
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 12. enrollments
-- ============================================================

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete restrict,
  course_offering_id uuid not null references public.course_offerings (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped', 'failed')),
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_enrollments_student_id on public.enrollments (student_id);
create index idx_enrollments_course_offering_id on public.enrollments (course_offering_id);
create index idx_enrollments_status on public.enrollments (status);

-- Prevents duplicate *active* enrollment of the same student in the same
-- course offering, while still allowing a historical (dropped/completed/
-- failed) row to coexist alongside a later active one.
create unique index uq_enrollments_active_student_offering
  on public.enrollments (student_id, course_offering_id)
  where status = 'active';

comment on index public.uq_enrollments_active_student_offering is
  'Prevents duplicate active enrollment for the same (student_id, course_offering_id) pair. Historical non-active rows are unaffected.';

create trigger trg_enrollments_set_updated_at
  before update on public.enrollments
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 13. attendance (+ course-offering integrity trigger)
-- ============================================================

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments (id) on delete restrict,
  course_session_id uuid not null references public.course_sessions (id) on delete restrict,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  remarks text,
  recorded_by uuid references public.faculty (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, course_session_id)
);

create index idx_attendance_enrollment_id on public.attendance (enrollment_id);
create index idx_attendance_course_session_id on public.attendance (course_session_id);

-- Attendance integrity: enrollment and session must share an offering ---
--
-- Nothing about the column/FK definitions above stops an attendance row
-- from pairing an enrollment belonging to course offering A with a
-- course session belonging to course offering B. That cannot be
-- expressed as a CHECK constraint (CHECK can only see columns in the row
-- being written, not data in other tables), so it is enforced with a
-- BEFORE trigger, per docs/database-design.md section 3.
create function public.enforce_attendance_offering_match()
returns trigger
language plpgsql
as $$
declare
  v_enrollment_offering_id uuid;
  v_session_offering_id uuid;
begin
  select course_offering_id
    into v_enrollment_offering_id
    from public.enrollments
    where id = new.enrollment_id;

  select course_offering_id
    into v_session_offering_id
    from public.course_sessions
    where id = new.course_session_id;

  if v_enrollment_offering_id is distinct from v_session_offering_id then
    raise exception
      'attendance row invalid: enrollment % belongs to course_offering %, but course_session % belongs to course_offering %',
      new.enrollment_id, v_enrollment_offering_id,
      new.course_session_id, v_session_offering_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.enforce_attendance_offering_match() is
  'Trigger function backing trg_attendance_offering_match: rejects any attendance row whose enrollment_id and course_session_id resolve to different course_offering_id values.';

create trigger trg_attendance_offering_match
  before insert or update on public.attendance
  for each row
  execute function public.enforce_attendance_offering_match();

comment on trigger trg_attendance_offering_match on public.attendance is
  'Enforces that enrollment_id and course_session_id belong to the same course_offering. See enforce_attendance_offering_match() and docs/database-design.md section 3.';

-- Separate, additional trigger: stamps updated_at on every update. Does
-- not modify or interact with trg_attendance_offering_match above.
create trigger trg_attendance_set_updated_at
  before update on public.attendance
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 14. results
-- ============================================================

create table public.results (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments (id) on delete restrict,
  marks numeric(5, 2) check (marks >= 0),
  grade text,
  grade_point numeric(3, 2) check (grade_point >= 0),
  remarks text,
  published_at timestamptz,
  recorded_by uuid references public.faculty (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_results_published_at on public.results (published_at);

comment on table public.results is
  'Final, course-level result per enrollment (at most one row per enrollment_id). No grading-scale bound is imposed on grade_point. An assessment_components table (quiz/midterm/final breakdown) is a documented future extension, not created here.';
comment on column public.results.published_at is
  'NULL means the result is not yet visible to the student. Intended as the predicate for a future student-read RLS policy (published_at is not null).';

create trigger trg_results_set_updated_at
  before update on public.results
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 15. timetables
-- ============================================================

create table public.timetables (
  id uuid primary key default gen_random_uuid(),
  course_offering_id uuid not null references public.course_offerings (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  room text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_offering_id, day_of_week, start_time)
);

create index idx_timetables_course_offering_id on public.timetables (course_offering_id);
create index idx_timetables_day_of_week on public.timetables (day_of_week);

comment on column public.timetables.course_offering_id is
  'ON DELETE CASCADE is intentional here, unlike most other foreign keys in this schema: a timetable row is scheduling metadata with no independent meaning once its offering is gone, not an academic record.';

create trigger trg_timetables_set_updated_at
  before update on public.timetables
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- 16. notices
-- ============================================================

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  published_by uuid references public.profiles (id) on delete set null,
  audience text not null default 'all' check (audience in ('all', 'students', 'faculty', 'management')),
  published_at timestamptz not null default now(),
  expires_at timestamptz check (expires_at > published_at),
  created_at timestamptz not null default now()
);

create index idx_notices_audience on public.notices (audience);
create index idx_notices_published_at on public.notices (published_at);
create index idx_notices_expires_at on public.notices (expires_at);

-- ============================================================
-- 17. notifications
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile_id_is_read on public.notifications (profile_id, is_read);
create index idx_notifications_created_at on public.notifications (created_at);
