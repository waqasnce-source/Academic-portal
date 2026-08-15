# Academic Portal — Database Design Proposal (v3)

Status: **proposal only** — no tables created, no SQL executed, no RLS
implemented. This document exists to satisfy CLAUDE.md rule 12 (schema
changes/decisions must be documented) ahead of an eventual migration.

v3 revises v2 per final review decisions: adds a database-level trigger
design closing the attendance/session/offering integrity gap, restores
`profiles.email` as a synced application-level copy, removes
`program_courses.course_type`, and gives `course_offering_faculty.role` a
controlled vocabulary with an enforced single-primary-instructor rule. See
§12 for the full changelog.

All tables live in the `public` schema and are intended to be governed by
Supabase Row Level Security once auth is implemented. `auth.users` is
Supabase-managed and is only referenced, never redefined, here.

---

## 1. Revised table list (17 — unchanged count from v2)

1. `profiles` — **changed** (`email` restored)
2. `departments`
3. `programs`
4. `program_courses` — **changed** (`course_type` removed)
5. `faculty`
6. `students`
7. `semesters`
8. `courses`
9. `course_offerings`
10. `course_offering_faculty` — **changed** (controlled `role` vocabulary + single-primary constraint)
11. `course_sessions`
12. `enrollments`
13. `attendance` — **changed** (now protected by a trigger design, §3)
14. `results`
15. `timetables`
16. `notices`
17. `notifications`

Load order for a future migration, updated to include the trigger:
`departments → programs → program_courses` (after courses exist) `;
profiles → faculty, students; semesters; courses → course_offerings →
course_offering_faculty, course_sessions; enrollments → attendance
(+ its integrity trigger, created in the same migration as the table),
results; course_offerings → timetables; profiles → notices,
notifications`.

---

## 2. Table definitions

### `profiles`

One-to-one with `auth.users`. Holds identity/role data common to every
role.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK, FK → `auth.users(id)` ON DELETE CASCADE | — |
| role | text | NOT NULL | CHECK IN ('student','faculty','management') | — |
| full_name | text | NOT NULL | | — |
| email | text | NOT NULL | UNIQUE | — |
| phone | text | NULL | | — |
| avatar_url | text | NULL | | — |
| status | text | NOT NULL | CHECK IN ('active','inactive','suspended') | 'active' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

**Restored in v3** (v2 had removed it — reversed per this review):
`email text NOT NULL UNIQUE`. This is an **application-level copy** of the
email address Supabase Auth holds on `auth.users.email`, not a second
source of truth — `auth.users` remains authoritative for authentication
itself. The reason to keep a synced copy rather than always joining back
to `auth.users`: `auth` is a Supabase-managed schema that ordinary RLS
policies and PostgREST don't read from, so without a copy here, any
feature that needs to *show* an email (a management user list, a faculty
roster) would need a server-only Admin-API round trip for every lookup.
With the copy, an ordinary RLS policy (self-read via `id = auth.uid()`,
plus whatever broader read policy management ends up with) covers it
directly. This also resolves the concern raised in v2 §8/§12 about
management having no path to see student/faculty emails without the
service-role key.

**Synchronization** is out of scope for this design-only stage — once
authentication is implemented, an `AFTER INSERT OR UPDATE` trigger on
`auth.users` (Supabase's standard pattern for this) is what keeps
`profiles.email` in step. Not designed further here since it depends on
the auth implementation, which this task explicitly excludes.

**Service-role key confirmation**: this restoration does not require, and
must not use, the Supabase service-role/secret key anywhere in browser
code. The existing `lib/supabase/client.ts` and `lib/supabase/server.ts`
(already in the repo) authenticate using only
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — reading or writing
`profiles.email` through either client goes through ordinary RLS like any
other column, and neither file needed to change for this revision.

---

### `departments`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| code | text | NOT NULL | UNIQUE | — |
| name | text | NOT NULL | UNIQUE | — |
| status | text | NOT NULL | CHECK IN ('active','inactive') | 'active' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged.

---

### `programs`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| department_id | uuid | NOT NULL | FK → `departments(id)` ON DELETE RESTRICT | — |
| code | text | NOT NULL | UNIQUE | — |
| name | text | NOT NULL | | — |
| degree_level | text | NOT NULL | CHECK IN ('diploma','bachelor','master','phd') | — |
| duration_years | numeric(3,1) | NOT NULL | CHECK (duration_years > 0) | — |
| status | text | NOT NULL | CHECK IN ('active','inactive') | 'active' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged.

---

### `program_courses`

Maps courses into a program's curriculum.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| program_id | uuid | NOT NULL | FK → `programs(id)` ON DELETE RESTRICT | — |
| course_id | uuid | NOT NULL | FK → `courses(id)` ON DELETE RESTRICT | — |
| recommended_semester | integer | NULL | CHECK (recommended_semester > 0) | — |
| is_elective | boolean | NOT NULL | | false |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

**`course_type` removed in v3** — v2's free-text `course_type` column sat
alongside `is_elective` with no enforced relationship between the two
(flagged as an inconsistency risk in v2 §8/§12). Removing it eliminates
that risk entirely rather than trying to constrain it; `is_elective`
alone is sufficient to answer the one thing actually specified
("elective or not"). No additional curriculum categories are introduced
in its place, per instruction.

Unique constraint: `(program_id, course_id)` — a course appears at most
once in a given program's curriculum. `recommended_semester` stays
nullable (open electives may have no fixed term).

Indexes: `program_courses(program_id)`, `program_courses(course_id)`,
`program_courses(recommended_semester)`.

---

### `faculty`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| profile_id | uuid | NOT NULL | FK → `profiles(id)` ON DELETE RESTRICT, UNIQUE | — |
| employee_number | text | NOT NULL | UNIQUE | — |
| department_id | uuid | NOT NULL | FK → `departments(id)` ON DELETE RESTRICT | — |
| designation | text | NOT NULL | | — |
| status | text | NOT NULL | CHECK IN ('active','inactive') | 'active' |
| joined_date | date | NULL | | — |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged.

---

### `students`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| profile_id | uuid | NOT NULL | FK → `profiles(id)` ON DELETE RESTRICT, UNIQUE | — |
| student_number | text | NOT NULL | UNIQUE | — |
| program_id | uuid | NOT NULL | FK → `programs(id)` ON DELETE RESTRICT | — |
| admission_year | integer | NOT NULL | CHECK (admission_year BETWEEN 2000 AND 2100) | — |
| status | text | NOT NULL | CHECK IN ('active','inactive','graduated','suspended','withdrawn') | 'active' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged — still no `current_semester`; still a single direct
`program_id` FK (see §10 for why `student_programs` remains unadded).

---

### `semesters`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| academic_year | text | NOT NULL | | — |
| name | text | NOT NULL | | — |
| start_date | date | NOT NULL | | — |
| end_date | date | NOT NULL | CHECK (end_date > start_date) | — |
| status | text | NOT NULL | CHECK IN ('upcoming','ongoing','completed') | 'upcoming' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unique constraint: `(academic_year, name)`. Unchanged.

---

### `courses`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| department_id | uuid | NOT NULL | FK → `departments(id)` ON DELETE RESTRICT | — |
| code | text | NOT NULL | UNIQUE | — |
| name | text | NOT NULL | | — |
| credit_hours | numeric(3,1) | NOT NULL | CHECK (credit_hours > 0) | — |
| status | text | NOT NULL | CHECK IN ('active','inactive') | 'active' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged.

---

### `course_offerings`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| course_id | uuid | NOT NULL | FK → `courses(id)` ON DELETE RESTRICT | — |
| semester_id | uuid | NOT NULL | FK → `semesters(id)` ON DELETE RESTRICT | — |
| section | text | NOT NULL | | 'A' |
| capacity | integer | NULL | CHECK (capacity > 0) | — |
| status | text | NOT NULL | CHECK IN ('planned','open','closed','cancelled') | 'planned' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged from v2 (no `faculty_id` column — instructor assignment lives in
`course_offering_faculty`). Unique constraint: `(course_id, semester_id,
section)`.

---

### `course_offering_faculty`

Assigns one or more faculty members to a course offering.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| course_offering_id | uuid | NOT NULL | FK → `course_offerings(id)` ON DELETE RESTRICT | — |
| faculty_id | uuid | NOT NULL | FK → `faculty(id)` ON DELETE RESTRICT | — |
| role | text | NOT NULL | CHECK IN ('primary','co_instructor','lab_instructor') | 'primary' |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

**Changed in v3**: `role` now has a controlled vocabulary —
`'primary'`, `'co_instructor'`, `'lab_instructor'` — instead of v2's
unconstrained free text.

**Two unique constraints** (both needed, enforcing two different rules):

1. `UNIQUE (course_offering_id, faculty_id)` — a given faculty member can
   only be assigned once to a given offering (no duplicate assignment,
   regardless of role).
2. `UNIQUE (course_offering_id) WHERE role = 'primary'` — a **partial**
   unique index guaranteeing at most one `'primary'` row per offering.
   This is what resolves v2's open decision §8.2 ("should exactly one
   primary instructor be enforced?") — yes, now enforced at the database
   level. `co_instructor` and `lab_instructor` rows are unrestricted in
   count.

A `course_offerings` row with **zero** matching rows here remains a valid
"TBA" state — the partial unique index only constrains what happens once
a `'primary'` row exists, it doesn't require one to exist.

Indexes: `course_offering_faculty(course_offering_id)`,
`course_offering_faculty(faculty_id)` (the partial unique index above
also serves as an index for "who is the primary instructor of offering
X" lookups).

---

### `course_sessions`

The concrete, dated occurrences of a course offering — what attendance is
recorded against, distinct from `timetables`' recurring weekly pattern.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| course_offering_id | uuid | NOT NULL | FK → `course_offerings(id)` ON DELETE RESTRICT | — |
| class_date | date | NOT NULL | | — |
| start_time | time | NOT NULL | | — |
| end_time | time | NOT NULL | CHECK (end_time > start_time) | — |
| room | text | NULL | | — |
| session_type | text | NOT NULL | | — |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged from v2. Unique constraint: `(course_offering_id, class_date,
start_time)`. `session_type` remains free text (no enum) — not part of
this revision's scope, still an open item (§9).

`timetables` (weekly template, no date) and `course_sessions` (actual
dated occurrence) remain deliberately unlinked, as in v2 — see §9.

---

### `enrollments`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| student_id | uuid | NOT NULL | FK → `students(id)` ON DELETE RESTRICT | — |
| course_offering_id | uuid | NOT NULL | FK → `course_offerings(id)` ON DELETE RESTRICT | — |
| status | text | NOT NULL | CHECK IN ('active','completed','dropped','failed') | 'active' |
| enrolled_at | timestamptz | NOT NULL | | now() |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged. Partial unique index: `UNIQUE (student_id, course_offering_id)
WHERE status = 'active'`.

---

### `attendance`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| enrollment_id | uuid | NOT NULL | FK → `enrollments(id)` ON DELETE RESTRICT | — |
| course_session_id | uuid | NOT NULL | FK → `course_sessions(id)` ON DELETE RESTRICT | — |
| status | text | NOT NULL | CHECK IN ('present','absent','late','excused') | — |
| remarks | text | NULL | | — |
| recorded_by | uuid | NULL | FK → `faculty(id)` ON DELETE SET NULL | — |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Column shape unchanged from v2. Unique constraint: `(enrollment_id,
course_session_id)`.

**Integrity gap now designed (previously just flagged)**: v2 noted that
nothing stops `enrollment_id` and `course_session_id` from resolving to
different course offerings. That gap is now closed at the design level by
a dedicated trigger — see **§3**. It is not yet implemented as SQL (out of
scope for this document per instruction), but it is no longer an
open/undesigned risk — it's a specified piece of the migration to come.

Indexes: `attendance(enrollment_id)`, `attendance(course_session_id)`.

---

### `results`

Unchanged from v2 — kept as final, course-level results only.

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| enrollment_id | uuid | NOT NULL | FK → `enrollments(id)` ON DELETE RESTRICT, UNIQUE | — |
| marks | numeric(5,2) | NULL | CHECK (marks >= 0) | — |
| grade | text | NULL | | — |
| grade_point | numeric(3,2) | NULL | CHECK (grade_point >= 0) | — |
| remarks | text | NULL | | — |
| published_at | timestamptz | NULL | | — |
| recorded_by | uuid | NULL | FK → `faculty(id)` ON DELETE SET NULL | — |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

No grading-scale bound on `grade_point` (still explicitly deferred).
`assessment_components` remains a documented future extension, not built.

---

### `timetables`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| course_offering_id | uuid | NOT NULL | FK → `course_offerings(id)` ON DELETE CASCADE | — |
| day_of_week | smallint | NOT NULL | CHECK (day_of_week BETWEEN 0 AND 6) | — |
| start_time | time | NOT NULL | | — |
| end_time | time | NOT NULL | CHECK (end_time > start_time) | — |
| room | text | NULL | | — |
| created_at | timestamptz | NOT NULL | | now() |
| updated_at | timestamptz | NOT NULL | | now() |

Unchanged. Unique constraint: `(course_offering_id, day_of_week,
start_time)`.

---

### `notices`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| title | text | NOT NULL | | — |
| content | text | NOT NULL | | — |
| published_by | uuid | NULL | FK → `profiles(id)` ON DELETE SET NULL | — |
| audience | text | NOT NULL | CHECK IN ('all','students','faculty','management') | 'all' |
| published_at | timestamptz | NOT NULL | | now() |
| expires_at | timestamptz | NULL | CHECK (expires_at > published_at) | — |
| created_at | timestamptz | NOT NULL | | now() |

Unchanged — role-level targeting only, kept for V1 per instruction.

---

### `notifications`

| Column | Type | Null | Key | Default |
|---|---|---|---|---|
| id | uuid | NOT NULL | PK | gen_random_uuid() |
| profile_id | uuid | NOT NULL | FK → `profiles(id)` ON DELETE CASCADE | — |
| title | text | NOT NULL | | — |
| message | text | NOT NULL | | — |
| is_read | boolean | NOT NULL | | false |
| read_at | timestamptz | NULL | | — |
| created_at | timestamptz | NOT NULL | | now() |

Unchanged.

---

## 3. Attendance integrity: course-offering match (trigger design)

**Requirement**: an `attendance` row's `enrollment_id` and
`course_session_id` must resolve to the *same* `course_offering_id`. A
row pairing an enrollment in offering A with a session from offering B
must be rejected.

**Why not a `CHECK` constraint**: Postgres `CHECK` constraints can only
evaluate expressions over columns in the row being written — they cannot
look up data in other tables. This rule needs the offering behind
`enrollment_id` (via `enrollments.course_offering_id`) and the offering
behind `course_session_id` (via `course_sessions.course_offering_id`)
compared against each other, which only a trigger can do.

**Why not RLS**: RLS policies control *who* is allowed to write a row
(authorization); they don't validate that the row's own data is
internally consistent. This is a data-integrity rule, not an
authorization rule, so it belongs in a trigger regardless of what RLS
policies end up governing writes to `attendance`.

This section documents the design only — no `CREATE FUNCTION` /
`CREATE TRIGGER` statements are written here, per instruction. They
belong in the SQL migration stage, in the same migration that creates the
`attendance` table (so the table is never live without the trigger).

**Function responsibility** (conceptual name:
`attendance_enrollment_session_offering_match`):

1. On the row being inserted or updated, resolve
   `enrollment_offering := (course_offering_id of NEW.enrollment_id, via
   enrollments)`.
2. Resolve `session_offering := (course_offering_id of
   NEW.course_session_id, via course_sessions)`.
3. If `enrollment_offering IS DISTINCT FROM session_offering`, abort the
   write with a descriptive error (e.g. "attendance enrollment and
   session belong to different course offerings") — no row is written.
4. Otherwise, allow the write to proceed unchanged.

**Trigger binding**: `BEFORE INSERT OR UPDATE ON attendance FOR EACH
ROW`. Both `INSERT` and `UPDATE` are covered — `UPDATE` matters because
`enrollment_id` or `course_session_id` could in principle be corrected
after the fact, and the same mismatch could be introduced at that point
too.

**Performance**: both lookups are single-row reads against primary keys
(`enrollments.id`, `course_sessions.id`), so the added cost per write is
negligible even at per-class-per-student attendance volume.

**Status**: this is a firm design, ready to be implemented verbatim as
PL/pgSQL when the migration is written. It is the one piece of this
proposal that *requires* procedural SQL (a function + trigger) rather
than a declarative constraint — flagged clearly so it isn't dropped when
the migration is drafted.

---

## 4. Revised relationship description

- `auth.users (1) → (1) profiles`
- `profiles (1) → (0..1) students`, `profiles (1) → (0..1) faculty`
- `departments (1) → (N) {programs, faculty, courses}`
- `programs (M) ←→ (N) courses` via `program_courses`
- `programs (1) → (N) students`
- `courses (1) → (N) course_offerings`
- `semesters (1) → (N) course_offerings`
- `course_offerings (M) ←→ (N) faculty` via `course_offering_faculty`
  (at most one `'primary'` per offering, enforced)
- `course_offerings (1) → (N) course_sessions`
- `course_offerings (1) → (N) enrollments`
- `course_offerings (1) → (N) timetables`
- `students (1) → (N) enrollments`
- `enrollments (1) → (N) attendance`, constrained to share the same
  offering as `course_sessions` via the §3 trigger
- `course_sessions (1) → (N) attendance`
- `enrollments (1) → (0..1) results`
- `profiles (1) → (N) notifications`
- `profiles (1) → (N) notices` (as publisher)

No relationships changed shape in v3 — only the `course_offering_faculty`
constraint set and the (now-designed) `attendance` integrity rule.

---

## 5. Cardinality of key relationships

| Relationship | Cardinality |
|---|---|
| auth.users → profiles | 1:1 |
| profiles → students | 1:0..1 |
| profiles → faculty | 1:0..1 |
| departments → {programs, faculty, courses} | 1:N |
| programs ↔ courses (via program_courses) | M:N |
| programs → students | 1:N |
| courses → course_offerings | 1:N |
| semesters → course_offerings | 1:N |
| course_offerings ↔ faculty (via course_offering_faculty) | M:N (0..N faculty; ≤1 `primary`) |
| course_offerings → course_sessions | 1:N |
| course_offerings → enrollments | 1:N |
| course_offerings → timetables | 1:N |
| students → enrollments | 1:N |
| enrollments → attendance | 1:N |
| course_sessions → attendance | 1:N |
| enrollments → results | 1:0..1 |
| profiles → notifications | 1:N |

Unchanged from v2.

---

## 6. Recommended indexes (full, post-revision)

- `profiles(role)`, `profiles(status)` — `email` already indexed via its
  `UNIQUE` constraint
- `students(program_id)`, `students(status)`
- `faculty(department_id)`, `faculty(status)`
- `programs(department_id)`
- `program_courses(program_id)`, `program_courses(course_id)`,
  `program_courses(recommended_semester)`
- `courses(department_id)`, `courses(status)`
- `course_offerings(semester_id)`, `course_offerings(course_id)`,
  `course_offerings(status)`
- `course_offering_faculty(course_offering_id)`,
  `course_offering_faculty(faculty_id)` — plus the partial unique index
  on `(course_offering_id) WHERE role = 'primary'`
- `course_sessions(course_offering_id)`, `course_sessions(class_date)`
- `enrollments(student_id)`, `enrollments(course_offering_id)`,
  `enrollments(status)`
- `attendance(enrollment_id)`, `attendance(course_session_id)`
- `results(published_at)`
- `timetables(course_offering_id)`, `timetables(day_of_week)`
- `notices(audience)`, `notices(published_at)`, `notices(expires_at)`
- `notifications(profile_id, is_read)`, `notifications(created_at)`

---

## 7. Important CHECK constraints (full, post-revision)

- `semesters`: `end_date > start_date`
- `timetables`: `end_time > start_time`, `day_of_week BETWEEN 0 AND 6`
- `course_sessions`: `end_time > start_time`
- `notices`: `expires_at > published_at` (when not null)
- `courses`: `credit_hours > 0`
- `programs`: `duration_years > 0`
- `program_courses`: `recommended_semester > 0` (when not null)
- `course_offerings`: `capacity > 0` (when not null)
- `course_offering_faculty`: `role IN ('primary','co_instructor',
  'lab_instructor')` — **new controlled vocabulary in v3**
- `students`: `admission_year BETWEEN 2000 AND 2100`
- `results`: `marks >= 0`, `grade_point >= 0` (no upper bound — grading
  scale still intentionally not imposed)
- `profiles.role`, `profiles.status`, `departments.status`,
  `programs.status`, `programs.degree_level`, `faculty.status`,
  `students.status`, `semesters.status`, `courses.status`,
  `course_offerings.status`, `attendance.status`, `notices.audience` —
  all `CHECK (... IN (...))`, not Postgres `ENUM` types.
- `course_sessions.session_type` remains free text, deliberately
  unconstrained (still an open item, §9) — the only categorical column
  left without a fixed vocabulary after this revision.

---

## 8. RLS implications (design-time only — still not implemented)

- **`profiles`** — self-access via `id = auth.uid()`. `email` is now a
  normal column governed by that same policy (plus whatever broader
  management read policy is written later) — no admin-API workaround
  needed for the common case of management looking up a user's email.
  This does **not** grant the browser client anything beyond RLS: the
  anon/publishable key used by `lib/supabase/client.ts` is still subject
  to every policy like any other authenticated request, and there
  remains no path from client code to the service-role key.
- **`students` / `faculty`** — unchanged self-access pattern via
  `profile_id = auth.uid()`.
- **Faculty access to their offerings** — unchanged from v2: a join
  through `course_offering_faculty`:
  ```
  course_offering_id IN (
    SELECT course_offering_id FROM course_offering_faculty
    WHERE faculty_id IN (SELECT id FROM faculty WHERE profile_id = auth.uid())
  )
  ```
  The new `role` vocabulary doesn't change this join — a policy can
  optionally narrow it to `role = 'primary'` if only the lead instructor
  (not co-instructors/lab instructors) should manage results, for
  example. That's a policy-writing decision for the RLS stage, not a
  schema one.
- **`attendance`** — write policy still resolves through
  `course_session_id → course_offerings → course_offering_faculty`, as in
  v2. The new trigger (§3) is independent of and complementary to RLS: RLS
  decides *who* may write, the trigger decides whether *what* they wrote
  is internally consistent. Both apply on every write.
- **`course_sessions`, `course_offering_faculty`, `program_courses`** —
  policy shapes unchanged from v2 (readable broadly, writable by
  assigned faculty/management as applicable).
- **`results`, `notices`, `notifications`, `timetables`, `courses`,
  `programs`, `departments`, `semesters`, `enrollments`** — unchanged
  from v2.

---

## 9. Remaining open decisions

1. Should `course_sessions` be bulk-generated from `timetables` (with an
   optional traceability link back to the template row), or stay
   independent as proposed? (carried over, still open)
2. `course_sessions.session_type` has no fixed vocabulary — the last
   remaining unconstrained categorical column after this revision. Worth
   a `CHECK` once real session-type usage patterns are known.
3. Grading scale bound on `results.grade_point` — still intentionally
   not imposed; revisit only when you're ready to specify one.
4. `course_offerings.status` transitions (`planned → open →
   closed/cancelled`) aren't enforced as a state machine, just a
   `CHECK IN` — acceptable for V1, flagged in case stricter enforcement
   is wanted later.
5. `auth.users → profiles.email` sync trigger — not designed yet;
   depends on how authentication is implemented, out of scope here.

Resolved since v2 (no longer open): `course_type` vs `is_elective`
consistency (column removed); whether to enforce a single `'primary'`
instructor per offering (now enforced via partial unique index);
`profiles.email` removal impact (email restored).

---

## 10. `student_programs` — still evaluated, still not added

No change from v2's conclusion. `students.program_id` as a single direct
FK remains sufficient for everything specified. A `student_programs`
history table stays a genuine **optional future extension**, worth
building only if program transfers/major changes need first-class
historical tracking — not inferred from current requirements.

---

## 11. Potential integrity problems and mitigations (updated)

1. **Role/child-row drift** (`profiles.role` vs. existence of a matching
   `students`/`faculty` row) — unchanged, application-layer concern.
2. **Cross-department teaching** — unchanged, intentional allowance.
3. **Enrolling into a closed/cancelled offering** — unchanged, not
   DB-enforced.
4. **Duplicate active enrollment** — unchanged, partial unique index.
5. **Multiple results per enrollment** — unchanged,
   `UNIQUE(enrollment_id)`.
6. **Attendance outside the semester window** — unchanged, not
   DB-enforced (would need a further trigger beyond the one in §3).
7. **Timetable room double-booking** — unchanged, not prevented.
8. **Orphaned history from hard deletes** — unchanged posture, see §13
   for the explicit delete-safety walkthrough.
9. **Attendance/session/offering mismatch — now designed, not just
   flagged.** See §3. Enforcement is a trigger, to be implemented
   verbatim in the migration.
10. **Duplicate faculty assignment** — prevented by
    `UNIQUE(course_offering_id, faculty_id)`.
11. **Multiple `'primary'` instructors on one offering — now prevented**
    by the new partial unique index (v3 change).
12. **Duplicate attendance for the same session** — prevented by
    `UNIQUE(enrollment_id, course_session_id)`.
13. **Zero-instructor offerings going unnoticed** — still a valid TBA
    state by design; a reporting concern, not a schema one.
14. **Inconsistent free-text categorical values** — narrowed in v3 to
    just `course_sessions.session_type` (down from three columns in v2,
    since `course_type` is gone and `course_offering_faculty.role` now
    has a `CHECK`).

---

## 12. Changelog vs v2

| Change | v2 | v3 |
|---|---|---|
| Attendance/session/offering integrity | flagged as an un-enforced gap | trigger design specified (§3), ready for migration |
| `profiles.email` | removed | restored: `text NOT NULL UNIQUE`, synced app-level copy of `auth.users.email` |
| `program_courses.course_type` | present, free text, unconstrained vs. `is_elective` | removed |
| `course_offering_faculty.role` | free text, default `'primary'`, no enum | `CHECK IN ('primary','co_instructor','lab_instructor')` |
| Single primary instructor per offering | not enforced (open decision) | enforced via partial unique index |
| Roles (student/faculty/management) | unchanged | unchanged |
| `student_programs` | evaluated, not added | unchanged conclusion |
| Notices audience | role-level enum | unchanged |
| Rooms | free text | unchanged |
| No-hard-delete posture | RESTRICT-heavy | unchanged |

---

## 13. Final review pass

Systematic re-check requested before sign-off, run against the complete
v3 design:

**Relationships** — confirmed unchanged in shape from v2 (§4); only
`course_offering_faculty`'s constraint set and `attendance`'s integrity
enforcement changed, not the tables' relationships to each other.

**Foreign keys** — every FK re-checked table by table (§2). All FKs into
history-bearing tables (`departments`, `programs`, `program_courses`,
`courses`, `semesters`, `faculty`, `students`, `course_offerings`,
`course_offering_faculty`, `course_sessions`, `enrollments`) remain
`ON DELETE RESTRICT`. The two intentional non-RESTRICT exceptions are
unchanged and still justified: `timetables.course_offering_id` (CASCADE —
scheduling metadata, not a record) and `notifications.profile_id`
(CASCADE — per-user inbox, not shared academic data). `attendance` and
`results`'s `recorded_by → faculty(id)` stay `ON DELETE SET NULL`
(preserve the record, drop the attribution if that faculty row is
somehow removed). `profiles.id → auth.users(id)` stays CASCADE, but see
the delete-safety walkthrough below for why that's still safe.

**Indexes** — full list re-verified (§6); no stale entries (no index
referenced the now-removed `course_type`, since none existed for it), no
missing entries for new/changed constraints (`profiles.email`'s unique
index, `course_offering_faculty`'s partial unique index, both accounted
for).

**Uniqueness constraints** — re-verified per table: `profiles(id)`,
`profiles(email)` — **new**; `departments(code)`, `departments(name)`;
`programs(code)`; `program_courses(program_id, course_id)`;
`faculty(profile_id)`, `faculty(employee_number)`;
`students(profile_id)`, `students(student_number)`;
`semesters(academic_year, name)`; `courses(code)`;
`course_offerings(course_id, semester_id, section)`;
`course_offering_faculty(course_offering_id, faculty_id)` and
`course_offering_faculty(course_offering_id) WHERE role='primary'` —
**new partial index**; `course_sessions(course_offering_id, class_date,
start_time)`; `enrollments(student_id, course_offering_id) WHERE
status='active'`; `attendance(enrollment_id, course_session_id)`;
`results(enrollment_id)`; `timetables(course_offering_id, day_of_week,
start_time)`. No gaps found against the brief's stated requirements.

**RLS implications** — re-walked in §8; no policy shape became
inconsistent with another. Restoring `profiles.email` strictly *adds* a
capability (management can read it under a normal policy) without
weakening any existing boundary — students/faculty still only ever see
their own row via `id = auth.uid()`, and the browser client still only
ever holds the publishable key.

**No historical academic data can be accidentally deleted** — traced the
actual deletion chain, not just the per-table FK annotations: if a
`students` (or `faculty`) row exists for a given `profiles.id`, that
`students.profile_id → profiles(id)` FK is `RESTRICT`. Postgres enforces
`RESTRICT` against *any* attempted deletion of the referenced row,
including one arriving via a `CASCADE` from further up the chain — so
even deleting the underlying `auth.users` row (which is defined to
`CASCADE` into `profiles`) is blocked mid-cascade the moment it would
touch a `profiles` row that a `students`/`faculty` row still points to.
In practice: **you cannot hard-delete a user with academic history, at
any level, without first reassigning or deactivating their
students/faculty record.** `status` columns are the only sanctioned way
to "remove" such an entity. This behavior is unaffected by restoring
`profiles.email` — it's a plain column, not part of any delete path.

**Attendance integrity rule is enforceable** — confirmed implementable
with standard PostgreSQL features only: a `BEFORE INSERT OR UPDATE`
trigger calling a `PLPGSQL` function that does two indexed primary-key
lookups and raises an exception on mismatch (§3). No extensions, no
deferred constraints, no exotic features required. It composes cleanly
with every RLS policy design in §8 (trigger fires regardless of which
policy allowed the write) and with the RESTRICT-heavy delete posture
above (nothing about the trigger touches deletion).

---

## 14. Concerns

- The attendance trigger (§3) is now a firm design but still **zero
  lines of it exist yet** — it must not be forgotten when the migration
  is written; recommend writing the `CREATE TABLE attendance` and its
  trigger in the same migration file so the table is never live without
  the guard.
- `course_sessions.session_type` is the last unconstrained categorical
  column (§9.2) — low risk today with no data yet, but worth deciding on
  before bulk data entry starts, same as the now-resolved `role` column
  was.
- `profiles.email` syncing from `auth.users` is a real piece of future
  work (§9.5) that this document intentionally doesn't design, since it
  depends on decisions the auth-implementation task will make. Flagged so
  it isn't assumed to already be handled.

No SQL has been written or executed, and no tables were created. This
document remains the review artifact.

---

**DESIGN READY FOR MIGRATION**

All four requested changes are incorporated, the attendance integrity
rule has a concrete and implementable enforcement design (§3), the
delete-safety walkthrough (§13) confirms no historical academic data can
be silently lost, and every remaining open item (§9) is a non-blocking
product decision (vocabulary choices, an optional future table, a
deliberately-deferred grading scale) rather than a structural gap. The
schema is internally consistent and ready to be turned into an actual SQL
migration.

---

## 15. Phase 3 addendum — academic progress / student-milestone system

Everything above this section describes the schema as it stood before
Phase 3 (this section's date). It is left unedited as a historical
record; **status annotations above ("no tables created") are stale as of
this addendum** — the base 17 tables plus `system_settings` were created
and are live in production, as is everything described here.

Phase 3 is implemented across three migrations, which are the exact
source of truth for column types/defaults/constraints (every design
decision below is also commented inline at its exact point in these
files — this section is a summary, not a duplicate):

- `supabase/migrations/20260814180000_academic_progress_tracking.sql` — 15 new tables + two constraint relaxations on `faculty`
- `supabase/migrations/20260814180500_academic_progress_tracking_rls.sql` — RLS + grants for all 15 new tables
- `supabase/migrations/20260814181500_academic_progress_seed_data.sql` — specializations, NCEG faculty roster, MS/MPhil + PhD milestone templates, document requirements

### 15.1 Reused, not duplicated

Per explicit instruction, `departments` continues to serve as the
discipline structure — **no `disciplines` table was created.** `profiles`,
`students`, `faculty`, `programs`, `courses`, `semesters` are all reused
as-is (with the two `faculty` relaxations below). `enrollments` and
`results` continue to serve as the student-course and course-result
records; no `student_courses` / `course_results` tables were created
alongside them.

### 15.2 Two relaxations to `faculty` (not destructive — NOT NULL → nullable)

- `faculty.profile_id` — nullable, so the NCEG roster can exist before any
  Supabase Auth account is provisioned. **No Auth accounts were created.**
- `faculty.department_id` — nullable, since the supplied roster states no
  department per person.
- `faculty.employee_number` — nullable (UNIQUE retained), since the
  supplied roster has no employee numbers and fabricating them was
  explicitly disallowed.
- New columns `faculty.name` (not null — the table was confirmed empty,
  so no backfill was needed) and `faculty.email` (nullable, unconstrained)
  give roster entries an identity independent of `profiles`.

### 15.3 New tables (15)

`specializations`, `supervisor_assignments`, `milestone_templates`,
`student_milestones`, `research_projects`, `research_proposals`,
`document_requirements`, `document_submissions`,
`extension_applications`, `thesis_records`, `thesis_reviewers`,
`thesis_reviews`, `thesis_corrections`, `viva_examinations`,
`result_declarations`.

Plus two new columns on `students`: `specialization_id` (nullable FK to
`specializations`) and `phd_entry_basis` (nullable, see §15.4).

### 15.4 Two schema additions beyond the brief's literal column lists

The Phase 3 brief gave exact column lists for `milestone_templates` and
`students`. Two columns were added beyond those lists because the
supplied academic rules cannot be encoded without them — both are
constraint-free additive columns, not a redesign:

1. **`milestone_templates.applicable_entry_basis`** (nullable text,
   `'ms_mphil_llm'` / `'bs_master'`) and **`students.phd_entry_basis`**
   (same two values) — the brief describes two parallel PhD timing tracks
   (coursework, comprehensive exam, ASRB submission deadlines all differ
   depending on whether the scholar entered via MS/MPhil/LLM or via
   BS/Master) but supplied no column to distinguish them. Null on a
   template means "applies regardless of track" (used for every MS/MPhil
   template and most PhD templates); non-null pairs are used only where
   the brief actually gives two different deadlines (Coursework,
   Comprehensive Examination ×2, ASRB Presentation, Research Period — see
   the seed migration).
2. **`milestone_templates.target_days_after_prerequisite`** — the brief's
   only relative-date column was `target_days_after_admission`, but two
   supplied rules ("comprehensive exam within 3 months of coursework
   completion", "thesis research at least one year after ASRB approval")
   are relative to a *prerequisite milestone's completion*, not to
   admission.

### 15.5 Fork/merge points in the PhD prerequisite chain

`prerequisite_milestone_id` is a single-parent self-reference, which
cannot represent "two tracks converge back into one step" (e.g. GSC
Presentation follows Coursework regardless of track, but Coursework is
two separate rows). At each such point the downstream milestone's
`prerequisite_milestone_id` is left `null` rather than arbitrarily
picking one track's row; `sequence_no` remains the authoritative
ordering signal for display and for `lib/academic/status-engine.ts`,
which uses sequence order (within the student's entry-basis-filtered
template set) as its primary "what's next" logic, with
`prerequisite_milestone_id` consulted for relative-date calculations
where it is set. See the inline comments in the PhD section of
`20260814181500_academic_progress_seed_data.sql` for every specific
fork/merge point and the reasoning at each one.

### 15.6 Status vocabulary reuse

Rather than inventing a separate vocabulary per table, the exact 11
values given for `student_milestones.status` are reused verbatim on
`research_proposals.gsc_status` / `asrb_status`, `thesis_records.status`,
`thesis_corrections.status`, and `document_submissions.status`. Columns
for which no vocabulary was supplied anywhere in the brief
(`research_projects.status`, `thesis_reviewers.status`,
`thesis_records.clearance_status`, `viva_examinations.status`/`result`,
`result_declarations.status`/`examiner_fee_status`/`transcript_status`)
are left as unconstrained text rather than guessing an academic
vocabulary that was never given. `result_declarations`'s five checklist
fields (`clearance_uop`, `clearance_nceg`, `library_submission`,
`it_submission`, `secrecy_submission`) are booleans — the most neutral,
non-invented type for a yes/no gate.

### 15.7 RLS summary

Every new table: management has full CRUD. Students can `select` only
their own rows (via `student_id = get_my_student_id()`, or via a join to
the owning `thesis_records`/`research_projects` row for the tables one
level removed from `students`). Faculty can `select` rows only for
students where an **active** `supervisor_assignments` row links them —
never a blanket "any faculty" policy, unlike the existing (pre-Phase-3)
`students_select_authenticated` policy, which this migration does not
touch. `student_milestones` is the one table given faculty write access
(insert/update, scoped the same way, mirroring the existing
`attendance_faculty_insert`/`_update` pattern) — every other new table is
write-restricted to management in this phase; broader faculty/student
write access (extension applications, document uploads, thesis review
data entry) is deferred to the phase that builds the corresponding UI
workflow, per the brief's own instruction not to fully build the student
portal yet.

**Flagged, not silently decided:** `thesis_reviewers` (reviewer
name/affiliation/country/email) is readable by the student under the
same "read own thesis" policy as everything else — some institutions
keep reviewer identity confidential from the candidate (blind review).
Implemented as literally specified; revisit if NCEG wants this narrowed.

### 15.8 Verification performed

Structural: `supabase db reset` against a local Dockerized Postgres
(applying all six pre-Phase-3 migrations plus the three Phase 3 ones from
scratch) completed with no errors, twice (once before the seed migration
existed, once after). Functional: a throwaway, rolled-back local
transaction created two students, one supervising faculty member (active
`supervisor_assignments` row for student 1 only), and one
`student_milestones` row per student, then verified — by switching
`request.jwt.claims` per Postgres role, the actual mechanism RLS
evaluates — that (1) each student sees only their own milestone row, (2)
the supervising faculty member sees and can update only student 1's row,
and (3) the same faculty member's attempted update of student 2's row is
silently filtered to zero rows by RLS, not an error. Seed data was
verified on the actual remote database read-only after push: 15
specializations correctly scoped to their departments, 39 milestone
templates (16 MS/MPhil + 23 PhD, dual-track fork confirmed at the
`COURSEWORK`/`ASRB_PRESENTATION` rows), 36 document requirements, 27
faculty, and confirmed zero students/supervisor_assignments/etc. — no
placeholder data was created.

---

## 16. Phase 8B addendum — curriculum requirements, grading scale, result history

Follows the Phase 8A architecture audit/design report (chat deliverable,
not a file in this repo). Implements only the "foundation" slice of that
report: `curriculum_requirements`, `grading_scale`, `result_revisions`,
their RLS, the corresponding `lib/management/*.ts` modules, and the
`/management/curriculum-requirements` / `/management/grading-scale`
configuration UI. Course-catalog seeding, course-offering/enrollment/
attendance/grade-entry write UI, the degree-audit engine, and the student/
faculty coursework portals are explicitly deferred to later phases (8C+)
— see the Phase 8A report for the full roadmap.

Implemented across two migrations:

- `supabase/migrations/20260816090000_curriculum_grading_foundation.sql` —
  3 new tables + 1 trigger + the `btree_gist` extension.
- `supabase/migrations/20260816090500_curriculum_grading_foundation_rls.sql`
  — RLS + grants for all 3.

### 16.1 `curriculum_requirements` — purpose, and why `program_courses` remains

`program_courses` (the original 17-table schema) stays exactly as-is: a
plain program-to-course catalog membership with only an `is_elective`
flag. It was never designed to express *requirement* semantics (a
specific mandatory course vs. "N credit hours from this category"), and
`course_type` was deliberately removed from it back in v3 (§12) rather
than extended, precisely because a free-text category column with no
enforced relationship to `is_elective` was flagged as an inconsistency
risk. `curriculum_requirements` is a new, separate table that adds the
requirement semantics `program_courses` was never meant to carry, without
touching or duplicating that table's existing role.

A row is either:

- a **specific-course requirement** — `course_id` set, `required_credit_hours`
  null ("this exact course is required/available"), or
- a **category-level credit requirement** — `course_id` null,
  `required_credit_hours` set ("N credit hours of this category are
  required, from whichever courses satisfy it").

This is enforced, not just documented: `curriculum_requirements_course_or_category_ch`
CHECKs `course_id is null or required_credit_hours is null`. No row can
imply both at once, which is what lets the management UI (and any future
degree-audit logic) distinguish the two cases unambiguously rather than
inferring intent from which fields happen to be filled in.

**Not seeded.** The course lists supplied for Environmental Geosciences,
Geospatial Sciences, and the two PGD programs are source catalogs, not
confirmed degree-requirement rules — the Phase 8A report and the Phase 8B
instruction were both explicit that no compulsory/elective assignment may
be inferred from course naming or context. This table ships empty; it is
configured by management once NCEG confirms the actual requirements.

### 16.2 Specialization and PhD entry-basis scoping

`specialization_id` (nullable) reuses the same nullable-scoping
convention already established twice in this schema
(`milestone_templates.applicable_entry_basis`, `document_requirements`):
null applies to every specialization in the program; non-null scopes to
one. `applicable_entry_basis` (nullable, `ms_mphil_llm` / `bs_master`)
reuses the exact vocabulary and convention of
`students.phd_entry_basis` / `milestone_templates.applicable_entry_basis`
— no new fork mechanism, no duplicated vocabulary. Neither column
introduces a new specialization or discipline system; `specializations`
and `departments` are unchanged and untouched by this migration.

### 16.3 Deliberately unenforced: no `UNIQUE` constraint

No `UNIQUE` constraint is imposed on `curriculum_requirements` (e.g. on
`(program_id, specialization_id, course_id)`). Because `specialization_id`
and `course_id` are nullable and Postgres unique indexes treat every
`NULL` as distinct from every other `NULL`, a naive unique constraint
would not actually prevent the ambiguous duplicate case (two category-level
rows for the same program with a null specialization) — and it isn't even
clear such duplicates should always be forbidden (two different
category rows for the same program/null-specialization but different
`requirement_category` are legitimate). Documented here rather than
guessed, per explicit instruction; revisit with an expression/partial
unique index once real usage patterns are known.

### 16.4 `grading_scale` — purpose, and why no scale is seeded

A configurable reference table translating a marks range into a letter
grade and grade point. `results.grade_point` has been intentionally
unbound since the original v3 design ("No grading-scale bound is
imposed") — this table is what management will eventually use to
constrain and interpret it, once an actual scale is confirmed. **No
University of Peshawar / NCEG grading policy has been supplied**, so no
generic 4.0-style scale (or any other) is assumed or seeded. The table
ships empty; `/management/grading-scale` lets an authorized management
user configure the real scale later.

Two unambiguous constraints are enforced at the database level:
`grading_scale_max_gt_min` (`max_marks > min_marks`), and
`grading_scale_no_overlap_active` — a Postgres `EXCLUDE` constraint
(via the standard `btree_gist` extension, enabled by this migration) over
`numrange(min_marks, max_marks, '[]')`, scoped to `status = 'active'` only
so a deactivated/superseded band can coexist with its replacement instead
of blocking it.

### 16.5 `result_revisions` — immutable result history

A published academic result is a significant institutional record; this
table ensures it can never be silently overwritten, at the database
level, regardless of which code path performs the update. Mechanism:

- `trg_results_record_revision` (`AFTER UPDATE ON results`) inserts a
  `result_revisions` row automatically whenever `marks`, `grade`, or
  `grade_point` actually changes — comparing `OLD` vs `NEW` inside the
  trigger function, not left to application code to remember. It **never**
  fires on `INSERT` (a new result has no "previous" state), so the initial
  recording of a result never creates a revision.
- `changed_by` is captured via `auth.uid()` **inside the trigger**, not
  accepted as an application-supplied column — the same "don't trust the
  caller for attribution" posture already used throughout this app (e.g.
  Phase 7's `reviewResearchProposalStage` takes `reviewedBy` from
  `requireRole()`, never from form input), just enforced one level deeper,
  in the database itself, so it can't be bypassed by any future code path.
- `reason` reads an optional session-local Postgres setting
  (`app.result_change_reason`, via `current_setting(..., true)`) that
  nothing sets yet in Phase 8B — there is no grade-entry UI in this phase.
  Left as a documented, already-wired extension point for the Phase 8D
  grade-entry workflow to populate via `set_config(..., true)` before its
  `UPDATE`, without requiring a further trigger/migration change.
- The trigger function is `SECURITY DEFINER`, so the revision insert
  always succeeds regardless of the calling role's own RLS grants on
  `result_revisions` — this avoids a scenario where an authorized
  `results` update fails because of an unrelated RLS mismatch on the
  history table.

**RLS deliberately grants zero INSERT/UPDATE/DELETE policies** on
`result_revisions` — not even for management. The only path that ever
writes a row is the `SECURITY DEFINER` trigger, which bypasses RLS via
table ownership. With no write policies at all, no authenticated role can
insert, update, or delete a revision through the normal client — this is
what makes the history structurally immutable rather than immutable "by
convention." `SELECT` is scoped per role: management sees everything;
faculty see revisions only for results in offerings they are assigned to
teach (via `course_offering_faculty`, the existing teaching-scope
mechanism); a student sees revisions only for their own enrollment, and
only once the current result is published — mirroring
`results_select_authenticated`'s own student gate exactly.

**Flagged, not silently decided**: a student granted row-level access
under that last policy sees the *full* `result_revisions` row, including
`changed_by` and `reason` (administrative context). No column-level
restriction exists yet — Postgres RLS is row-level, not column-level.
This is acceptable for Phase 8B (no student-facing revision-history UI
exists yet to expose it through), but should be revisited — likely via a
restricted view — before any such UI is built.

`lib/management/results.ts` gained `createResult()` (plain insert, no
revision expected) and `updateResult()` (plain update — the trigger does
the rest) as data-access foundation only. No Server Action or UI calls
either yet; Phase 8B has no grade-entry workflow, per instruction. This
guarantees the eventual Phase 8D grade-entry workflow has no way to
bypass revision history, because the guarantee lives in the database, not
in whichever Server Action is written later.

### 16.6 RLS model (summary)

No new scoping mechanism was introduced. Every policy reuses one of the
three existing mechanisms verbatim: `has_role('management')` for
configuration writes; `course_offering_faculty` for faculty
teaching-scoped access (`result_revisions` only — curriculum/grading
reference data is broadly readable by faculty, same as `courses`/
`program_courses`); and student self-identity
(`students.profile_id = auth.uid()`) for a student's own program/
specialization/enrollment-scoped reads. `supervisor_assignments` is not
used anywhere in this addendum — coursework/grading is a teaching
relationship, not a research-supervision one, and the two remain
deliberately separate per the existing architecture.

| Table | Management | Faculty | Student |
|---|---|---|---|
| `curriculum_requirements` | Full CRUD | Read all (reference data) | Read own program, filtered to null-or-own specialization |
| `grading_scale` | Full CRUD | Read all | Read all (needed to interpret their own grade) |
| `result_revisions` | Read all; **no write policy for anyone** | Read own-offering results' revisions (`course_offering_faculty`) | Read own enrollment's revisions, only once the result is published |

### 16.7 Profile-less-student query fix

Fixed the nullable-`students.profile_id` `!inner`-embed hazard (the same
class of bug fixed in `faculty.ts`/`students.ts` during Phase 6, but
missed in the four modules below at the time since they predate that fix
and were never revisited) in:

- `lib/management/enrollments.ts`
- `lib/management/attendance.ts`
- `lib/management/results.ts`
- `lib/management/reports/teaching-load.ts` (a parallel hazard on the
  nullable `faculty.profile_id`, not `students.profile_id`)

In each case `profile:profiles!inner(...)` was changed to a plain
`profile:profiles(...)` embed, `name` (and, for enrollments, `email`) was
added to the same select so the UI has a fallback identity, and every
call site reading `.profile.full_name` directly was changed to
`.profile?.full_name ?? .name` — the same display-precedence convention
already used everywhere else in the app (`profiles.full_name` takes
precedence once an account is linked; the `students`/`faculty` table's
own `name` column is the fallback for a record with no linked account
yet).

### 16.8 Verification performed

Structural: `supabase db reset` against local Dockerized Postgres (all 13
migrations from scratch, including both Phase 8B migrations) completed
with no errors. Functional: a single rolled-back local transaction
(synthetic department/program/specialization/course/semester/course_offering,
a profile-linked student, a profile-less student, a profile-linked
faculty member, and a profile-less faculty member, per the same
throwaway-and-rollback discipline as the Phase 3 verification) confirmed,
by switching `request.jwt.claims` per role: (1) a profile-less student's
enrollment and a profile-less faculty member's teaching assignment both
now appear in a plain query using the fixed embed shape (previously
silently dropped); (2) `curriculum_requirements_course_or_category_ch`
rejects a row with both `course_id` and `required_credit_hours` set; (3)
a student sees only curriculum requirements for their own program with a
null-or-matching specialization, never another specialization's rows,
and cannot insert/update any row (RLS-filtered, verified via row-count,
not assumed from a thrown exception); (4) `grading_scale_max_gt_min` and
`grading_scale_no_overlap_active` both reject invalid/overlapping active
bands, while an overlapping *inactive* band is allowed; a student can
read the scale but not write it; (5) an initial `results` INSERT creates
zero `result_revisions` rows; an UPDATE that changes `marks`/`grade`/
`grade_point` creates exactly one, with correct `previous_*`/`new_*`
values and `changed_by` captured via `auth.uid()`; a metadata-only update
(`remarks`) creates no additional revision; direct INSERT/UPDATE/DELETE
against `result_revisions` is rejected for every role including
management (verified both by the RLS error and by re-querying the row
afterward to confirm it was untouched); a student sees a revision only
for their own enrollment once the result is published, another student
sees none, and the teaching faculty member sees it via
`course_offering_faculty`.

Remote: both migrations applied cleanly via `supabase db push`. Live
regression against the deployed app (26 Management routes, including
both new modules) returned 200 with no leaked Postgres/PostgREST errors.
A throwaway program, course, two `curriculum_requirements` rows (one
course-level, one category-level), and one `grading_scale` band were
created directly against remote to re-confirm the same CHECK/exclusion
constraints hold there, then deleted; a final query confirmed zero
leftover rows. Pre-existing remote row counts (4 departments, 27
faculty, 0 students) were confirmed unchanged — this phase touched no
existing data, only added two new empty configuration tables and one new
empty history table.

### 16.9 What remains deliberately deferred to 8C+

Course-catalog seeding; course-offering/enrollment/attendance/grade-entry
write UI (all four modules remain read-only management list pages, as
they were before this phase); `computeDegreeAudit()` and any GPA/CGPA
calculation; `/student/courses`, `/student/degree-progress`; a faculty
course-teaching portal; self-service student enrollment; and any actual
seed data for `curriculum_requirements` or `grading_scale`. Derived
academic values (GPA, remaining credit hours, current semester) remain,
per explicit instruction, values that must always be computed, never
stored — nothing in this phase adds a persisted derived column anywhere.

---

## 17. Phase 8C addendum — course catalog seed, course offerings, faculty assignment, enrollment

Turns the read-only coursework infrastructure inspected/kept-read-only in
Phase 8B into an operational Management workflow. **No new tables, no new
columns, no new constraints** — every table used here
(`courses`, `course_offerings`, `course_offering_faculty`, `enrollments`)
already existed with everything this phase needed; the schema was proven
sufficient before writing any code, exactly as instructed. The one
migration in this phase (`20260817090000_course_catalog_seed.sql`) is
pure `INSERT` data, not DDL.

### 17.1 Course catalog seed strategy

70 courses seeded from the course lists supplied for Environmental
Geosciences, Geospatial Sciences, PGD Geotechnical & Highway Engineering,
and PGD Gemology — `course_code` / title / `credit_hours` / department
only, per explicit instruction. Department mapping is a catalog fact
(which department administratively owns the course), never a curriculum
fact: `Geol.*` → Geol (including the shared "related/general" courses and
both PGD blocks, all supplied under `Geol.*` codes), `Envg.*` → Envg,
`Geos.*` → Geosp (the supplied source's own "GEOSPATIAL SCIENCES" section
header, not a literal code-prefix string match — course codes and
department codes are independent identifiers, and this mapping is
directly given by the source's own grouping, not inferred). Geophysics
receives no seeded courses — no Geophysics course list was supplied.

Uses `insert into courses (...) select ... from departments d ... where
d.code = 'X' ... on conflict (code) do nothing` — the exact pattern the
Phase 3 seed migration already established for specializations — rather
than a hard failure when a department code isn't found. This was a
deliberate correction made during this phase's own local verification: an
earlier draft used a `raise exception` guard, which is *more* defensive
in isolation but broke the standard "full `db reset` from an empty local
database" test flow, since departments are real institutional data never
seeded by any migration (confirmed: zero departments exist on a fresh
local reset, matching how the Phase 3 seed migration was already known to
behave). The `INSERT...SELECT...WHERE` form seeds zero rows locally
(same as Phase 3's specializations) and the correct 70 rows against
remote, where the four departments already exist — verified directly
against remote post-push (§17.9), the same way Phase 3's seed was
verified.

**Skipped, flagged, not guessed:**
- `Envg.799` (Seminar) — supplied credit hours are a range ("1–3"), and
  `courses.credit_hours` is a single value; seeding an arbitrary point in
  that range would misrepresent the source.
- Two "Project Report: additional 3 CH project" notes (PGD
  Geotechnical/Highway, PGD Gemology) — no course code was supplied for
  either.

**Preserved verbatim, not silently corrected:** two supplied titles
appear to contain source typos — "Computing with MATLABORATORY"
(`Geol.501`) and "Global Positing System" (`Geos.700`). Seeded exactly as
given; flagged in the Phase 8C completion report for confirmation rather
than guessed at.

**Normalized identifier, not altered content:** the source lists both
"Geos.730" (GIS Data Management) and "Geos.730 B" (a different course,
Geological applications of Remote sensing) as two distinct entries.
`courses.code` is `UNIQUE`, so the space was removed (`Geos.730B`) to
make it a valid, distinct key — the course's identity and content are
unchanged, only the code string's whitespace.

**Credit-hour notation "3(2+1)"** (e.g. `Geos.730B`, `Geos.830`) is
seeded as `credit_hours = 3` — the parenthetical is a lecture+practical
breakdown of the same total, not a different total, and no
lecture/practical-hour columns were added (explicitly out of scope).

`curriculum_requirements` (Phase 8B) is untouched by this seed — a course
existing in the catalog does not imply compulsory/elective/specialization
status, consistent with the explicit "do not use the course catalog seed
to create degree requirements" rule.

### 17.2 Course offering workflow

`lib/management/course-offerings.ts` gained `getCourseOfferingById`,
`createCourseOffering`, `updateCourseOffering`,
`getEnrollableOfferingOptions` (non-cancelled offerings, for the
enrollment form). New routes: `/management/course-offerings/new`,
`/management/course-offerings/[id]` (edit + faculty assignment). New
offerings can only select an **active** course (`getCourseOptions()`,
already filtered `status = 'active'`, reused from `courses.ts` — see
§17.7) — this is the "prevent an inactive course being newly offered"
rule, enforced by what the dropdown even offers, not a new constraint.
Editing an existing offering is not similarly restricted (a course that
became inactive after an offering was created remains editable, with the
edit page adding it back into its own options list so the pre-filled
select never silently loses the current value).

The database's own `unique (course_id, semester_id, section)` is the
actual duplicate-offering guard (23505); the `course_id`/`semester_id`
foreign keys (`on delete restrict`) are the actual nonexistent-course/
-semester guard (23503). No new validation logic duplicates either at the
application layer — `toUserMessage()` maps both to a clear message.

### 17.3 Faculty assignment model

Reuses `course_offering_faculty` exclusively — never
`supervisor_assignments`, which remains research-supervision-only. New:
`getCourseOfferingFacultyAssignments`, `assignFacultyToOffering`,
`removeFacultyAssignment`. The existing single-primary-instructor partial
unique index (`uq_course_offering_faculty_one_primary`) and the
`(course_offering_id, faculty_id)` unique constraint are the actual
guards; no new constraint was added.

**Documented limitation, not a workaround:** `course_offering_faculty`
has no status/end_date column (unlike `supervisor_assignments`, which
preserves history via an inactive row with an end date).
`removeFacultyAssignment` is therefore a **hard delete** — ending an
assignment leaves no historical trace of who used to teach an offering.
Per explicit instruction not to invent a history mechanism unless
absolutely necessary, this was left as-is and is flagged here rather than
solved with an unrequested schema change.

### 17.4 Enrollment workflow

`lib/management/enrollments.ts` gained `getEnrollmentById`,
`getActiveEnrollmentCount`, `createEnrollment`, `updateEnrollmentStatus`.
New routes: `/management/enrollments/new`, `/management/enrollments/[id]`
(status change only — the enrollment identity, student and offering,
is fixed at creation; changing status is the only later mutation,
matching "never delete historical academic enrollment records" and using
the existing status vocabulary exactly, unchanged). The database's
partial unique index (`(student_id, course_offering_id) WHERE status =
'active'`) is the actual duplicate-active-enrollment guard — verified to
still allow a later fresh attempt after a prior enrollment is marked
`dropped`/`completed`/`failed` (the historical row is preserved, never
deleted or overwritten).

### 17.5 Enrollment validation

Application-level checks in `createEnrollmentAction`, layered in front of
the database's own guards (never replacing them):
1. Student exists and `status = 'active'` (`getStudentById`).
2. Course offering exists and `status != 'cancelled'`.
3. Capacity: if `course_offerings.capacity` is set, reject when the
   current **active**-status enrollment count (`getActiveEnrollmentCount`)
   is `>= capacity`. No waitlist, no override mechanism — per explicit
   instruction, capacity is a hard cap in this phase; if management needs
   an override path later, that's a decision for a future phase, not
   invented here.
4. Duplicate active enrollment — left to the database's partial unique
   index (23505), not re-checked in application code, since it's already
   the authoritative guard.

### 17.6 Notification behavior

Reuses `lib/management/notifications.ts#notifyIfLinked` unchanged — no
second notification mechanism. Two workflow events notify: enrollment
created, enrollment status changed. Both `no-op` safely for a
profile-less student (`notifyIfLinked` already handles `profileId ===
null`). Administrative list/edit operations that aren't a meaningful
student-facing event (creating an offering, assigning faculty) do **not**
notify — reserved for actual student-facing workflow changes, per
explicit instruction.

### 17.7 Reused, not duplicated (`getCourseOptions`)

While extending `course-offerings.ts`, found that `getCourseOptions()`
(added in Phase 8B for the curriculum-requirement form) was the exact
function this phase's offering-create form also needed. Relocated it to
`courses.ts` (its natural home) with `curriculum-requirements.ts` now
re-exporting it from there — a small, directly-motivated consolidation,
not unrelated refactoring, avoiding a near-duplicate second copy.

### 17.8 RLS model

**No new policy, no new scoping mechanism.** Every operation in this
phase is already covered by existing RLS:
`course_offerings_insert_management` / `_update_management`,
`course_offering_faculty_insert_management` / `_delete_management`,
`enrollments_insert_management` / `_update_management` — all
`has_role('management')`, confirmed by direct test that a student and a
non-assigned faculty member cannot write to `enrollments`. Faculty read
visibility remains exactly `course_offering_faculty`-scoped
(`enrollments_select_authenticated`'s faculty branch), confirmed by
direct test that a faculty member assigned to an offering can read its
enrollments. Student visibility remains read-only, own-record-scoped;
self-registration was not implemented, per explicit instruction.

### 17.9 Profile-less student/faculty handling

The Phase 8B `!inner`-on-nullable-FK fix pattern was applied proactively
to every new embed added in this phase
(`course_offering_faculty.faculty:faculty!inner(...,
profile:profiles(...))` in `course-offerings.ts`,
`enrollments.student:students!inner(..., profile:profiles(...))` in
`enrollments.ts`'s new detail read) — `profile` is always a plain embed,
never `!inner`, with `name`/`profile?.full_name ?? name` as the display
fallback throughout every new list, dropdown, and detail view. Verified
directly: a profile-less student's enrollment and a profile-less faculty
member's `course_offering_faculty` assignment both appear correctly.

### 17.10 Verification performed

Local: `supabase db reset` (all 14 migrations, including the corrected
seed migration) completed cleanly from an empty database. A rolled-back
transaction (synthetic departments named `Geol`/`Envg`/`Geosp` so the
seed's own `INSERT...SELECT` logic could be exercised, plus
program/student/faculty/semester/offering fixtures) verified: the seed
insert's department linkage and idempotency (re-running is a no-op); no
duplicate course codes; the offering unique-constraint and FK guards;
the single-primary-instructor constraint; a profile-less faculty
assignment and a profile-less student enrollment both appear correctly;
capacity-check logic; enrollment status changes preserve history (the row
is never deleted, and a dropped enrollment correctly permits a later
fresh active one); RLS blocking student and non-permitted faculty writes
to `enrollments`, and correctly permitting the assigned faculty member's
read. `npm run lint`, `npm run build`, `npx tsc --noEmit` all clean.

Remote: `supabase db push` applied the seed migration; verified directly
— 70 courses (Envg 28, Geol 22, Geosp 20), zero duplicate codes, correct
department linkage on spot-checked rows, `Envg.799` correctly absent, and
pre-existing counts (4 departments, 27 faculty, 0 students) unchanged.
Live regression against the deployed app (26 Management routes) returned
200 with no leaked errors. A throwaway program/semester/student/faculty/
offering/enrollment/notification were created directly against remote,
exercised through the same operations the new Server Actions perform,
then deleted; a final query confirmed zero leftover rows and the course
count still exactly 70.

### 17.11 What remains deliberately deferred

Degree audit, GPA/CGPA calculation, `curriculum_requirements`/
`grading_scale` population, compulsory/elective assignment,
self-registration, faculty grade-entry/attendance-entry UI, result
publication UI, result-revision UI, current-semester persistence, course
prerequisites, course-repeat GPA rules, enrollment windows, a generic
`audit_logs` table, and the student/faculty coursework portals
(`/student/courses`, `/student/degree-progress`, a faculty "My Courses"
view) — all explicitly out of scope for this phase, per instruction.

---

## 18. Phase 8D addendum — faculty attendance entry, grade entry/publication

Turns the faculty-facing side of the coursework infrastructure
operational. **No new tables, no new columns, no new RLS policies.**
Every faculty mutation in this phase (`course_sessions`, `attendance`,
`results`) was already correctly scoped by `course_offering_faculty`-based
RLS policies that existed before this phase (confirmed by direct
inspection of the live policy text, not assumed) — this phase is
application code sitting on top of already-proven authorization, exactly
as instructed.

### 18.1 Faculty coursework authorization model

Identity resolution: `requireRole("faculty")` → `getCurrentFacultyId(profile.id)`
(existing, `lib/academic/identity.ts`, unchanged). Ownership: every new
Server Action (`lib/academic/faculty-courses.ts` /
`app/faculty/courses/actions.ts`) re-verifies
`isFacultyAssignedToOffering(facultyId, offeringId)` before any mutation
— defense in depth, not the actual boundary. The actual boundary remains
RLS: `course_sessions_faculty_insert/_update`,
`attendance_faculty_insert/_update`, `results_faculty_insert/_update`,
all scoped `course_offering_id IN (... course_offering_faculty WHERE
faculty_id = get_my_faculty_id())` — unchanged, unmodified, and never
weakened. `supervisor_assignments` is not used anywhere in this
addendum; teaching and research-supervision remain deliberately separate
relationships, per the existing architecture.

### 18.2 Attendance workflow

`getOfferingSessions` / `createCourseSession` / `getSessionRoster` /
`upsertAttendanceBatch` (`lib/academic/faculty-courses.ts`). A session's
roster only offers **active** enrollments (a dropped/completed enrollment
isn't attending a future session). One batch `UPSERT` per submission,
keyed on `attendance`'s existing `unique(enrollment_id,
course_session_id)` — re-submitting the same session's roster updates in
place rather than duplicating (verified). `course_sessions.session_type`
remains free text, exactly as before — no new vocabulary was introduced,
per explicit instruction. The pre-existing
`trg_attendance_offering_match` trigger (unmodified) remains the final
data-integrity guard against an enrollment/session pair from different
offerings — verified directly (a mismatched pair is rejected with the
trigger's own `23514`).

### 18.3 Grade workflow

`getOfferingRoster` / `upsertResultsBatch` (`lib/academic/faculty-courses.ts`).
One batch `UPSERT` per submission, keyed on `results.enrollment_id`
(already `UNIQUE`). The payload deliberately never includes
`published_at` — omitted from the upsert, so the `INSERT` branch (a
student's first-ever grade) defaults it to `NULL` (draft) and the `DO
UPDATE` branch leaves an existing value untouched; grade entry can never
silently publish or un-publish a result. **No grading scale is assumed or
applied** — `grading_scale` remains empty (per instruction, the real
NCEG/UoP policy hasn't been supplied), so faculty enter `marks`/`grade`/
`grade_point` directly; the UI is structured so that automatic
mark→grade derivation can be added later once a real active
`grading_scale` row exists, without a redesign.

### 18.4 Publication behavior

`publishResult` (`lib/academic/faculty-courses.ts`) is a plain `UPDATE`
touching only `published_at` — reuses the existing mechanism
(`results.published_at IS NOT NULL` = visible to the student, already the
established student-read gate) rather than inventing a second
publication flag. Publication is one-directional in this phase — no
"unpublish" was implemented, since nothing asked for one and inventing an
unpublish workflow would be inventing an institutional process.

### 18.5 Result-revision integration

**No manual `result_revisions` insert anywhere in the new code** — the
existing `trg_results_record_revision` trigger (Phase 8B, unmodified)
remains the sole writer. `upsertResultsBatch`'s `DO UPDATE` branch is a
genuine SQL `UPDATE` under the hood (Postgres fires `AFTER UPDATE`
triggers for the update branch of `INSERT ... ON CONFLICT DO UPDATE`,
never for the insert branch), so "no revision on initial grade entry, one
revision per subsequent actual mark/grade/grade_point change" holds
without any new code needing to know which branch it's in. `publishResult`
touches only `published_at`, which is outside the trigger's `WHEN`
clause, so publishing never creates a revision. `getResultRevisions`
(Phase 8B, `lib/management/results.ts`) is reused as-is where revision
history is surfaced — not duplicated.

**Stop condition, reported rather than resolved (Phase 8D §8):**
`result_revisions.reason` is still never populated. Setting it requires a
session-local Postgres GUC (`app.result_change_reason`,
`current_setting(..., true)` inside the trigger) that only a dedicated
Postgres function (callable via `.rpc()`) could set before the `UPDATE`
— `supabase-js` cannot issue a bare `SET LOCAL` through PostgREST.
Building that RPC is a genuine new database function, i.e. a schema
change, and per the explicit "if using it would require a schema or
database-function change, STOP and explain it before modifying it"
instruction, it was **not built**. `reason` stays `NULL` for every
revision created in this phase; wiring it up is deferred to whichever
future phase actually needs reason capture in the UI, and would need
this specific RPC to be proposed and approved first.

### 18.6 Grade-change safety — a finding, not a new policy

**Stop condition, reported rather than resolved (Phase 8D §9):** the
existing `results_faculty_update` RLS policy has no `published_at`
condition — a faculty member assigned to an offering can currently edit
a **published** result through the exact same mechanism as an
unpublished one, unrestricted by any existing policy. This phase does not
change that (inventing a new restriction was explicitly out of scope,
and the instruction was to report rather than invent). The grade-entry
UI surfaces this directly: a published result shows a "Published" badge
and a visible warning ("editing marks/grade above and saving will change
a published result") in the roster row, so the behavior is visible to
faculty rather than silent, but the underlying permission is unchanged.
`result_revisions` still captures the full before/after history of any
such edit, so no value is ever silently lost even though the edit itself
isn't blocked. Flagged in the completion report as needing an
institutional decision (should editing a published result require a
distinct, controlled workflow?) before any policy change is made.

### 18.7 Notification behavior

Reuses `notifyIfLinked()` (`lib/management/notifications.ts`, unchanged)
exclusively. Fires on `publishResultAction` only — not on attendance
entry, session creation, or a draft grade save, per explicit instruction
to reserve notifications for meaningful student-facing events. Safely
no-ops for a profile-less student (unchanged behavior, re-verified).

### 18.8 Profile-less student/faculty handling

Every new embed in `lib/academic/faculty-courses.ts` follows the
established Phase 8B/8C pattern: `profile:profiles` is always a plain
embed, never `!inner`, with `student.name`/`student.email` (or
`faculty.name`) as the fallback identity wherever a profile is absent.
Applied in `getOfferingRoster`, `getSessionRoster`, and the "My Courses"
list's underlying faculty-offering query.

### 18.9 Verification performed and its limits

**Local rolled-back-transaction testing could not be completed this
phase** — Docker Desktop failed in three different ways during this
session (filesystem corruption in Phase 8B, a wedged backend in Phase
8C, and an out-of-memory crash followed by persistent API errors in
Phase 8D itself) and remained unstable after a further recovery attempt.
Per your explicit direction, verification proceeded remote-only instead.
This is a materially smaller gap than it would be for a phase that
changed schema or RLS: Phase 8D adds neither, so the policy-level
behavior this session's local tests would normally re-confirm was
already proven correct against the identical policies in Phase 8C's
local + remote testing.

What was verified against remote: lint/build/`tsc --noEmit` clean; a
management-authenticated session is correctly redirected away from
`/faculty/courses` (role gate enforced) as is an unauthenticated session;
the full 26-route Management regression; a throwaway
program/course/semester/offering/faculty/student/session/enrollment
exercised the actual data-layer operations the new code performs —
session creation, attendance batch upsert (including re-submission
updating in place rather than duplicating), the pre-existing
offering-match trigger rejecting a mismatched enrollment/session pair,
the results upsert's insert branch creating zero revisions, publish
touching only `published_at` and creating zero revisions, and a direct
`result_revisions` insert still being rejected for every role. The
update-branch-creates-exactly-one-revision behavior was **deliberately
not re-exercised live against remote** — doing so would create a real,
permanently undeletable `result_revisions` row (no delete policy exists
for any role, by design), which would violate "clean up every throwaway
row." That exact behavior remains proven by Phase 8B's own rolled-back
local transaction (unaffected by this session's Docker issues, since it
already ran and completed in an earlier phase) and by code review
confirming `upsertResultsBatch`'s `DO UPDATE` branch is a genuine SQL
`UPDATE`, which is what the trigger's `AFTER UPDATE` binding reacts to.
All throwaway remote rows were deleted and a final query confirmed zero
leftover rows; pre-existing counts (70 courses, 27 faculty, 0 students)
confirmed unchanged.

**Not testable at all in this environment:** an actual authenticated
faculty *browser* session — no faculty member has a linked Supabase Auth
account (explicitly, deliberately not created, per every prior phase's
"no fake accounts" instruction), so the faculty UI itself could not be
exercised end-to-end through a real login. Verified instead via: direct
code review, the data-layer tests above (which exercise the exact
operations the Server Actions perform), and the confirmation that
`requireRole("faculty")` correctly gates the routes.

### 18.10 What remains deliberately deferred

Degree audit, GPA/CGPA calculation, `curriculum_requirements`/
`grading_scale` population, self-registration, result-revision reason
capture (blocked on the RPC decision in §18.5), any change to
grade-change-on-published-results behavior (§18.6, needs an institutional
decision), the full `/student/courses` / `/student/degree-progress`
portal, and any generic `audit_logs` table — all explicitly out of scope
for this phase.

---

## 19. Phase 8E addendum — degree audit, GPA/CGPA, coursework progress

Turns `curriculum_requirements` + `grading_scale` + `results` +
`enrollments` into a computed degree-audit result. **No new tables, no
new columns, no new RLS policies.** Everything is a pure computation over
data every reader already had access to.

### 19.1 Course→category association — the key design decision

`curriculum_requirements` has no dedicated "course pool" table, and
`courses` has no category column. The association between a course and a
requirement category is the `requirement_category` value already present
on **every** `curriculum_requirements` row, course-level or category-level.
A category's eligible course pool is therefore exactly the set of
course-level rows (`course_id` set, any `is_mandatory` value) sharing that
category for the same program/specialization/entry-basis — nothing wider,
nothing inferred from course code/name/department. A category-level quota
row (`course_id` null, `required_credit_hours` set) with **zero**
course-level rows in the same category has no eligible pool at all;
`computeDegreeAudit()` surfaces this explicitly
(`quotaConfiguredWithNoEligibleCourses: true`) rather than treating it as
silently satisfied or silently unsatisfiable-forever without explanation.

### 19.2 "Completed" — defined from `enrollments.status`, not grades

A course counts as completed when the student has **any** enrollment with
`status = 'completed'` for it — never inferred from `marks`/`grade`
thresholds (no institutional pass/fail rule exists to apply). This is
what already gates a category's course-pool credit hours and the
missing-mandatory-course list; it is completely independent of whether a
result has been published, since publication only gates *grade
visibility*, not course-completion status.

### 19.3 Four curriculum states

- `not_configured` — zero `curriculum_requirements` rows exist for the
  program at all.
- `partially_configured` — the program has rows configured, but none
  apply to this student's specific specialization/entry-basis combination
  (the same nullable-scoping filter as Phase 8B's RLS).
- `configured_satisfied` — applicable rows exist and every category is
  satisfied.
- `configured_incomplete` — applicable rows exist and at least one
  category is not yet satisfied.

`satisfiesCourseworkRequirement` is `true` **only** for
`configured_satisfied` — with nothing configured, no condition has been
established, so it is never trivially true regardless of how many credit
hours a student has accumulated, per explicit instruction.

### 19.4 GPA/CGPA

`cgpa` (cumulative, every semester) and `currentSemesterGpa` (the
student's most-recently-started semester only, derived purely from
`enrollments`/`semesters` — no `students.current_semester` column was
added) are both computed by the same pure `computeGpaFigure()`:

1. Only `enrollments.status = 'completed'` **and** `results.published_at
   IS NOT NULL` rows are ever counted — applies identically whether the
   caller is management or (in a future phase) a student, so an
   unpublished result is never folded into a GPA figure through any path.
2. Grade point resolution per course: `results.grade_point` if entered
   directly; otherwise, only if an **active** `grading_scale` band's
   `[min_marks, max_marks]` (inclusive both ends, matching the exclusion
   constraint's own semantics) contains `results.marks`; otherwise
   unresolvable — never derived from an invented formula (e.g.
   `marks / 25`).
3. `gradingScaleConfigured: false` is reported whenever zero active
   `grading_scale` rows exist, verbatim per instruction, rather than the
   UI assuming a generic 4.0 scale.
4. **Multiple attempts**: if a course has more than one
   completed+published enrollment, the institutional repeat/improvement
   rule (best/latest/average) is not configured anywhere in this system,
   so per explicit instruction those courses are **excluded from the GPA
   number** and listed in `coursesExcludedMultipleAttempts` — never
   silently resolved by picking one.
5. Credit-hour-weighted average over whatever remains.

### 19.5 Milestone synchronization

Reuses `syncStudentMilestoneByCode()` unchanged — no second
coursework-status mechanism. Inspecting the Phase 3 seed data (not
assumed) found the MS/MPhil track uses milestone code `COURSE_WORK`
while the PhD track uses `COURSEWORK` (no underscore) — both codes are
passed, exactly the same multi-code pattern already used for
`VIVA_VOCE`/`DEFENCE_VIVA_VOCE`. The sync is a **deliberate, explicit
management action** (a "Sync Coursework Milestone" button on Student
360°, `app/management/students/[id]/actions.ts`), never a side effect of
merely viewing the page — the action re-computes the audit server-side
and refuses to sync if `satisfiesCourseworkRequirement` is false,
regardless of what the client last rendered. Verified: calling the
underlying upsert twice produces exactly one `student_milestones` row
(the existing `onConflict: "student_id,milestone_template_id"` upsert
already guarantees this).

### 19.6 `computeAcademicStatus()` is unmodified

Confirmed by inspection and left untouched — it still reads only
`milestone_templates` + `student_milestones` + `extension_applications`.
Degree-audit results reach the status engine only indirectly, through the
`COURSE_WORK`/`COURSEWORK` milestone row the sync action writes, exactly
like every other milestone-producing workflow in this app (GSC/ASRB,
thesis). No coursework table is queried by the status engine directly.

### 19.7 Student 360° integration

A new "Coursework / Degree Audit" section: curriculum-status badge,
semester count, per-category table (completed/required CH, mandatory
course completion, a distinct "no eligible courses configured" state),
missing-mandatory-course list, and two GPA cards (CGPA and current-term)
each showing the grading-scale-not-configured and multiple-attempts
caveats inline rather than hiding the number. This *is* the
management-facing degree-audit view — no separate route was built, since
Student 360° already cleanly serves that purpose (per instruction, "if
the existing architecture supports it cleanly").

### 19.8 Authorization

`getApplicableCurriculumRequirements()` and `getStudentCourseworkEnrollments()`
(`lib/academic/curriculum.ts`, `lib/academic/degree-audit.ts`) both read
through the normal RLS-respecting client with no caller-identity checks
of their own — RLS remains the actual boundary, unchanged from Phase
8B/8C (`curriculum_requirements_select_authenticated`'s student branch,
`enrollments_select_authenticated`, `results_select_authenticated`). No
new policy was added; no existing policy was touched. Faculty access was
not extended in any way — nothing in this phase grants faculty a new
read path.

**Not built this phase, by explicit instruction:** any `/student/*`
route consuming this engine — that's Phase 8F. The pure functions are
already shaped for that future reuse (mirroring
`computeAcademicStatus()`'s own fetch/compute split) without needing a
rewrite.

### 19.9 Verification performed and its limits

Docker Desktop remained unstable this session (containers cycling
through restart loops even while `docker info` reported ready) — per the
precedent you set in Phase 8D for the identical situation, and because
this phase again introduces zero schema/RLS changes, verification
proceeded remote-only rather than via a local rolled-back transaction.

What was verified against remote, using real computed output (not just
structural DB checks): the full Management route regression; a
throwaway program/courses/two-semester/four-offering/curriculum/student
fixture exercising a mandatory course completed twice (a genuine
multiple-attempt case), an elective pool satisfied via two courses (one
grade-point-direct, one marks-derived through a throwaway active
`grading_scale` band), and one deliberately unpublished result; the
rendered Student 360° page correctly showed "Coursework Satisfied," the
sync button, and the multiple-attempts caveat; the milestone template
lookup confirmed `COURSE_WORK` is the correct MS/MPhil code; two
sequential milestone upserts produced exactly one row; a profile-less
student rendered correctly; a second program with zero curriculum
requirements correctly showed "No Curriculum Configured" with no sync
button offered. All throwaway rows deleted and confirmed absent;
pre-existing counts (70 courses, 27 faculty, 0 students) unchanged.

**Not exercised this session:** the `configured_incomplete` state's
rendered page specifically (verified only as the same code path evaluated
before the fixture's courses were completed, not screenshotted at that
intermediate point) — the underlying branch is the same
`byCategory.every(satisfied)` check already proven by the
`configured_satisfied` end-state test, just with different input data.
Student-session RLS isolation was not re-derived via JWT-claims switching
(unavailable without local Docker this session) — it relies on the
identical, unmodified policies already proven in Phase 8B/8C's own local
testing, since this phase added no new policy for any of these tables.

### 19.10 What remains deliberately deferred

Any `/student/*` coursework route, curriculum-requirement seed data,
grading-scale seed data, an institutional repeat/improvement rule, PhD
24-vs-48-CH-by-entry-basis clarification (still purely driven by whatever
`applicable_entry_basis` rows management configures — nothing was
assumed), and account provisioning — all explicitly out of scope for
this phase.

## 20. Phase 8F addendum — student/faculty portal integration and account/identity linking

No schema or RLS changes this phase. Every table, column, and policy used
below already existed (`profiles.status`, `students.profile_id`,
`faculty.profile_id`, `profiles_update_authenticated`,
`students_update_management`, `faculty_update_management`,
`notifications_self_update`) — this phase is entirely application-layer
UI and read/link/toggle functions on top of them.

### 20.1 Shared rendering, not duplicated logic

`app/_components/degree-audit-display.tsx` (`CurriculumStatusBadge`,
`CategoryProgressTable`, `MissingMandatoryList`, `GpaCard`) and
`app/_components/notifications-widget.tsx` (`NotificationsWidget`) are new
role-agnostic presentational components. The Phase 8E Student 360° page
(`app/management/students/[id]/page.tsx`) was refactored to import these
instead of its own inline copies, and the new
`/student/degree-progress` page uses the identical components — so the
management and student renderings of the same `computeDegreeAudit()`
output can never drift apart. `getStudentDegreeAudit()`,
`getStudentCourseworkEnrollments()`, and `getRecentNotificationsForProfile()`
are called unmodified from Phase 8E/notifications code; no computation
logic was reimplemented anywhere in this phase.

### 20.2 Student Portal

- `/student` (dashboard): added a Notifications widget (top), a
  Coursework/Degree Progress summary card (curriculum-status badge, CH
  completed, missing-mandatory count, CGPA, current-semester GPA, links to
  the two new routes), and a Thesis & Viva card (only rendered if a
  `thesis_records` row exists) — reusing `lib/academic/thesis.ts`'s
  already student-scoped readers (`getThesisRecordForStudent`,
  `getVivaExaminationForStudent`), which were already RLS-safe and
  unused by any page until now.
- `/student/courses` (new): read-only enrollment list from
  `getStudentCourseworkEnrollments()`, grouped into Current
  (`status='active'`)/Completed/Other. An unpublished result renders as
  "Not yet published" rather than any marks/grade value — the actual
  gating is `results` RLS (a student session never receives an
  unpublished row at all for enrollments they don't own via faculty
  role), this is just the correct display for the null case.
- `/student/degree-progress` (new): thin wrapper around
  `getStudentDegreeAudit()`, rendered with the exact shared components
  the Student 360° page uses — no `CourseworkSyncButton` (management-only
  action) is rendered here.
- No `/student/courses/[id]` or `/student/notifications` route was built —
  the dashboard widget and the two above routes covered every stated
  requirement without a parallel detail-page system.

### 20.3 Faculty Portal

The existing `/faculty` dashboard (My Courses + Your Supervisees, from
Phase 8D) already satisfied the "Teaching" requirements (offerings,
enrolled counts, published-grades tile) — the only addition was the same
`NotificationsWidget` used on `/student`, wired to
`getRecentNotificationsForProfile(profile.id, 5)`. No new faculty routes.

### 20.4 Notifications — one mechanism, two callers

`app/_actions/notifications.ts` (`markNotificationReadAction(path, id)`)
is a single, role-agnostic Server Action used by both dashboards. It calls
`requireProfile()` (any authenticated, active profile) rather than
`requireRole()`, because `notifications_self_update` RLS
(`profile_id = auth.uid() OR management`) is the actual ownership
boundary regardless of role — the action does not duplicate that check.

### 20.5 Account/Identity Integration — what's buildable without a service-role key

Confirmed again this phase (`.env.local` has only
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`):
true account creation/invitation (`auth.admin.createUser` /
`inviteUserByEmail`) needs the Supabase Admin API and a service-role key,
neither available here — **not built, and no workaround was built for
it**. `lib/management/accounts.ts` covers exactly the three things that
are safe without it:

- `getLinkedAccountInfo(kind, masterId)` / `getUnlinkedProfiles(role)` —
  read-only identity-state queries.
- `linkStudentProfile` / `linkFacultyProfile` — `UPDATE
  students/faculty SET profile_id = $1`, gated by the existing
  `students_update_management` / `faculty_update_management` RLS and the
  existing `UNIQUE` constraint on `profile_id` (a role pre-check gives a
  friendlier error than the raw `23505` for a mismatched role; the
  uniqueness itself is still DB-enforced, not just checked in
  application code).
- `setProfileStatus(profileId, status)` — toggles `profiles.status`
  (`active`/`inactive`/`suspended`), a new `PROFILE_STATUSES` constant
  added to `lib/management/status-enums.ts` alongside the existing
  per-table status vocabularies. This is the application-level login
  gate, explicitly distinct from `students.status`/`faculty.status`
  (academic standing/employment status, unchanged) and from a true
  Supabase Auth-level ban (also needs the Admin API).

UI: an "Account / Identity" section was added to
`app/management/students/[id]/page.tsx` (Student 360°, which already
existed) and to `app/management/faculty/[id]/edit/page.tsx` (faculty has
no separate detail page, so this replaces that page's prior placeholder
note "account linking is not built in this phase"). No new route was
created for either. Linked state shows the account's name/email/status
plus a Suspend/Reactivate toggle; unlinked state shows a `<select>` of
same-role unlinked profiles plus a "Link Account" button, or an explicit
"no unlinked accounts available" message when the candidate list is
empty.

### 20.6 Verification performed and its limits

No schema/RLS change this phase, so the Phase 8D/8E remote-only
precedent applies without needing to re-ask — `npm run lint`, `npx tsc
--noEmit`, and `npm run build` all passed clean. Every new/changed route
was probed unauthenticated first (`/student`, `/student/courses`,
`/student/degree-progress`, `/faculty`, the two management detail
routes) and confirmed to 307-redirect to `/login` with no data or
error-internals leaked to an anonymous caller.

Signed in as the real management account and, against remote, ran a
throwaway program/semester/offering/student fixture (one completed,
published enrollment) through the Student 360° page: confirmed the new
Account/Identity section renders correctly for an unlinked student
alongside the still-working Degree Audit section from Phase 8E, and
confirmed a real, existing faculty record's edit page renders its
Account/Identity section correctly. All throwaway rows deleted and
confirmed absent afterward; pre-existing counts (70 courses, 27 faculty)
unchanged.

**Not exercised this session, and why:** the actual `/student` and
`/faculty` portal pages could not be click-tested as a signed-in
student/faculty user, because — confirmed by querying remote directly —
zero `profiles` rows with `role='student'` or `role='faculty'` currently
exist in this environment (only the one management profile does). This
is exactly the gap Part C of this phase describes, not an oversight: no
student/faculty Supabase Auth account exists yet to sign in as, and none
could be created without the unavailable service-role key. The
`getUnlinkedProfiles()` "no unlinked accounts available" empty state was
therefore the only reachable state for the link form this session and
was confirmed to render correctly; the populated-`<select>` and
successful-link code paths are covered by TypeScript/build correctness
and code review, not a live end-to-end submission, and should be
re-verified live the first time a real student/faculty account exists to
link.

## 21. Phase 9 — secure account provisioning (invite-by-email)

### 21.1 Architecture chosen: Option A, server-side Admin API

Inspected first: no existing `SUPABASE_SERVICE_ROLE_KEY`/`admin.auth`/
`createUser`/`inviteUserByEmail` usage anywhere in the codebase (Phase 8F's
`lib/management/accounts.ts` only had comments noting the key's absence);
no `auth.users` trigger creates `profiles` rows (confirmed by grepping
every migration — a deliberate, explicitly-noted Phase 1 deferral); no
`/auth/*` route existed; `app/management/users` is read-only (list/filter
only, no create route) — so there was no pre-existing provisioning
mechanism to accidentally duplicate.

Chose **Option A** (server-side Admin API via a dedicated server-only
module) over an Edge Function: this project has no Edge Functions anywhere
(`supabase/functions/` doesn't exist), every other privileged operation
already goes through a Next.js Server Action + the normal RLS-scoped
client, and Server Actions already run exclusively server-side — an Edge
Function would add a second deployment target and a second place secrets
live, for no security benefit a Server Action doesn't already provide.

### 21.2 The one new privileged module

`lib/supabase/admin.ts` — `createAdminClient()`, the **only** place in the
app allowed to read `SUPABASE_SERVICE_ROLE_KEY`. Guarded by `import
"server-only"` (build fails if ever imported from a Client Component,
same mechanism already relied on throughout this codebase). It does not
itself check the caller's role — every caller (`provisionStudentAccount`,
`provisionFacultyAccount`, `getAuthConfirmationState`, all in
`lib/management/accounts.ts`) is invoked only from a Server Action that
already ran `requireRole("management")` first. The Admin API bypasses RLS
entirely, so that `requireRole()` call is the actual authorization
boundary for every privileged operation in this phase — documented here
per your instruction to call this out explicitly.

### 21.3 Provisioning workflow (both roles, one shared internal function)

`provisionAccount(kind, masterId, email, fullName, redirectTo)` (private;
`provisionStudentAccount`/`provisionFacultyAccount` are the exported thin
wrappers, mirroring the existing `linkStudentProfile`/`linkFacultyProfile`
pattern from Phase 8F):

1. Reject if the master record is already linked (Case B).
2. Reject if an existing `profiles` row already has that email (Case D,
   for the case where the app can see it) — points management at "Link
   Existing Account" instead.
3. `admin.auth.admin.inviteUserByEmail(email, { data: { role, full_name },
   redirectTo })` — creates the `auth.users` row and emails the invite.
4. Insert the `profiles` row (`id` = the new Auth user's id, role, name,
   email, `status: 'active'`) using the **normal**, RLS-scoped client
   (not the admin client) — `profiles_insert_management` RLS
   (`has_role('management')`) is what actually authorizes this insert,
   correctly, since the Server Action runs as the management caller's own
   session.
5. Link via the **existing** Phase 8F `linkStudentProfile`/
   `linkFacultyProfile` — reused verbatim, not duplicated.
6. If step 4 or 5 fails, roll back by `admin.auth.admin.deleteUser()` on
   the Auth user just created. This is safe specifically because of the
   schema's existing FK design: `profiles.id references auth.users(id) on
   delete cascade` (so deleting the Auth user also removes the just-created
   profile row), while `students.profile_id`/`faculty.profile_id
   references profiles(id) on delete restrict` would normally block
   deleting a profile — but at the point of any rollback, nothing has
   linked to that profile yet, so no restrict conflict occurs. No new
   constraint or migration was needed for this to be correct.

### 21.4 Case C — an orphaned Auth user with no profile — deliberately not auto-resolved

If `inviteUserByEmail` rejects with `email_exists` (a real Supabase
`ErrorCode`, confirmed from `@supabase/auth-js`'s type definitions) and no
matching `profiles` row exists in the app's own tables, the error is
surfaced to management as a manual-review case rather than silently
resolved by any email-matching heuristic. Per your explicit instruction,
matching only on an email string is not a safe basis for attaching an
existing Auth identity to a record — a typo'd email could otherwise
silently attach a real stranger's account to someone else's student
record. This is a real limitation, not an oversight; resolving it (if it
ever occurs) is a manual Supabase Dashboard operation for now.

### 21.5 Invitation vs password creation

Management never sets or sees a password — only an email. `redirectTo` is
built from the Server Action's own request `Origin` header
(`(await headers()).get("origin")`, Next.js's `headers()` API), pointed at
the new `/auth/confirm` route.

**New flow**: Supabase emails an invite link → the link redirects the
browser to `/auth/confirm?token_hash=...&type=invite` (added to
`PUBLIC_PATHS` in `lib/supabase/middleware.ts`, since the browser arrives
with no session cookie yet) → `verifyOtp({ token_hash, type: 'invite' })`
establishes a real session (only `type=invite` is accepted; this app has
no self-signup/recovery/magic-link UI to support, so other Supabase
`EmailOtpType` values are intentionally rejected here even though
`verifyOtp` would technically validate them) → redirect to the new
`/auth/set-password` page → `supabase.auth.updateUser({ password })` on
the normal client (no admin client involved — the user already has their
own valid session at this point) → redirect to `/dashboard`, which
already resolves role → `/student` or `/faculty` unmodified.

### 21.6 Account status vs Auth confirmation — kept separate, not merged

`profiles.status` (`active`/`inactive`/`suspended`) is set to `'active'`
immediately at provisioning and is unchanged in meaning from Phase 8F —
the application-level login gate, enforced by the existing
`requireProfile()`. It does **not** represent whether the invitee has
actually opened the email and set a password. That is Supabase Auth's own
`email_confirmed_at`, read live (never mirrored into a new column) via
the new `getAuthConfirmationState(profileId)` — returns `null` (not a
thrown error) if the admin client isn't configured, so a page rendering it
degrades to "status could not be determined" rather than crashing. Shown
in the UI as a separate "Invitation pending" badge alongside (never
replacing) the `profiles.status` badge. No new `profiles.status` value was
added — inventing a 4th status value for this would have needed a CHECK
constraint migration; the existing three-value model already says
everything it needs to about login-gate status, so this was avoided.

### 21.7 Deactivation — confirmed unchanged, flagged rather than guessed

Per your explicit instruction not to guess at an unstated institutional
policy: deactivating `students.status`/`faculty.status` (academic
standing/employment) still does **not** automatically touch
`profiles.status` (login gate) — these were already kept independent in
Phase 8F, and this phase didn't change that. Management must separately
use the Account/Identity section's Suspend/Reactivate control if login
access should also be revoked. No Supabase Auth-level ban
(`admin.updateUserById(id, { ban_duration })`) was added either: since
`requireProfile()` already redirects any non-`active` profile to
`/account-suspended` before they reach any protected route, suspending via
`profiles.status` is already fully effective as an application-level
access block without needing a second, Auth-level mechanism.

### 21.8 Database changes: none

Every table/column/policy used already existed. No migration was written
this phase.

### 21.9 Required environment variable

`SUPABASE_SERVICE_ROLE_KEY` — **not currently set** in `.env.local` (only
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are
present). Server-only: must never be prefixed `NEXT_PUBLIC_*`, must never
appear in a Client Component, must never be logged (confirmed:
`lib/supabase/admin.ts` never logs it; errors from the Admin API are
logged, but not the key itself). A `.env.local.example` file was
deliberately **not** created — this repo's `.gitignore` has a blanket
`.env*` rule (kept exactly as CLAUDE.md instructs, not narrowed), so any
`.env*`-prefixed example file would itself be silently gitignored and
therefore invisible to a teammate cloning the repo; this doc is the
tracked source of truth for what the variable is and where to get it
instead. Get the value from Supabase Dashboard → Project Settings → API →
`service_role` secret (the *actual* service role key, not the anon/
publishable key already in use) for the same project already referenced
by `NEXT_PUBLIC_SUPABASE_URL`. Add it to `.env.local` for local dev and to
the Vercel project's environment variables for production, per the
project's existing "keep both in sync" convention.

### 21.10 Verification performed and its limits

`npm run lint`, `npx tsc --noEmit`, `npm run build` all passed clean.
Confirmed via `.next/static` inspection that `SUPABASE_SERVICE_ROLE_KEY`
and `createAdminClient` do not appear anywhere in client-bundled output.
(`inviteUserByEmail`/`deleteUser` *method implementations* do appear in
client bundles — this is inherent to `@supabase/supabase-js`'s
`GoTrueAdminApi` class, which every `SupabaseClient` instance exposes
regardless of which key it was constructed with; it predates this phase
and is unrelated to `lib/supabase/client.ts`, which was not touched. The
browser-side client is still only ever constructed with the publishable
key, and Supabase's own Auth server rejects `/admin/*` endpoint calls that
aren't authenticated with an actual service-role JWT — code presence is
not the same as the secret being reachable, and the secret itself is
confirmed absent.)

Live, remote, authenticated as the real management account: full
Management route regression (16 modules, all 200); a throwaway
unlinked-student fixture's Student 360° page confirmed to render both
"Invite a new account" and "Or link an existing account," with the email
input correctly pre-filled from the record; a real existing faculty
record's edit page confirmed to render the same pattern; role-redirect
regression confirmed unchanged (`/student` and `/faculty` both still
307-redirect a management session to `/dashboard`); no PGRST/service-role
leak on any new or modified route. All throwaway rows deleted and
confirmed absent.

**Not exercised this session, and why:** the actual invite-submission →
Auth-user-creation → profile-insert → link → rollback-on-failure sequence
could not be run end-to-end, because `SUPABASE_SERVICE_ROLE_KEY` is
genuinely absent from this environment — every real attempt would
correctly stop at `createAdminClient()`'s own configuration check before
ever reaching Supabase. Confirming that specific "not configured" graceful
error path required actually submitting the form, which in turn requires
replaying Next.js Server Actions' internal POST protocol (an
implementation detail, not a stable HTTP contract) from a plain script —
judged too fragile to be worth attempting outside a real browser. This
should be manually click-tested once `SUPABASE_SERVICE_ROLE_KEY` is
configured, and the report is explicit that "an Auth user was created" is
not the same claim as "a real person received the email and logged in" —
email deliverability on the hosted Supabase project (no custom SMTP
provider is configured anywhere in this repo; `supabase/config.toml`'s
`[auth.email.smtp]` block is commented out, and that file only governs
local dev in any case) is a separate, unverified concern flagged for your
review in the final report.

A dev-server crash (Turbopack OOM, the same recurring Windows/memory
instability documented in earlier phases — unrelated to any code
correctness issue, confirmed by every check having already passed
immediately beforehand) interrupted the second live test script before
its own scripted cleanup ran; the resulting throwaway rows were confirmed
and deleted manually via a follow-up script, then re-confirmed absent.

### 21.11 What remains deliberately deferred

Auditability of who provisioned which account and when — the current
schema has no such record (no `notifications`-style log entry is created
for provisioning, and none of `profiles`/`students`/`faculty` carry a
"provisioned_by"/"provisioned_at" column). Flagged as a possible follow-up
per your instruction, not built as a new generic audit-log system this
phase. Case C (orphaned Auth user, no profile) resolution UI; Auth-level
banning as a second deactivation mechanism; custom SMTP/email-deliverability
configuration — all explicitly out of scope, see above.

## 22. Phase 9.1 — authentication/authorization/E2E audit findings

Audit-only phase; no new features. One migration was written, as a direct
consequence of a critical finding (§22.1) — nothing else in the schema or
app code changed.

### 22.1 CRITICAL, FIXED: self-privilege-escalation via `profiles.role`

`profiles_update_authenticated` RLS (`id = auth.uid() OR
has_role('management')`, from `20260813152648_remote_schema.sql`)
restricts which *row* an authenticated user may update, but RLS predicates
cannot restrict which *column*. Grepping every `.from("profiles")` write
site in the app confirmed zero legitimate self-service profile updates
exist anywhere in the codebase (every write goes through
`lib/management/accounts.ts`, gated by `requireRole("management")`) — so
the `id = auth.uid()` self-update branch was live at the database level
with no corresponding legitimate use. Any authenticated student/faculty
session could call the Supabase REST API directly (bypassing the Next.js
app entirely — they already hold a valid JWT and the public
anon/publishable key) and `PATCH` their own `profiles` row with
`{"role":"management"}`, silently escalating to full management RLS
privileges platform-wide.

**Fixed** in `20260818090000_profiles_self_privilege_escalation_fix.sql`
(applied to remote, confirmed via `supabase migration list`): a `BEFORE
UPDATE` trigger, `prevent_profile_self_privilege_escalation()`, blocks any
change to `role`, `status`, or `email` on any `profiles` row unless the
caller already has the management role (checked via the existing
`has_role()`, unchanged). The RLS policy itself was left as-is (self-update
remains available for a possible future "edit my own name/phone/avatar"
feature) — the trigger is a defense-in-depth column guard, not a
row-predicate change, so it holds even if that policy is loosened further
later. Verified live: a management session can still update its own
`status` (no regression); the actual exploit could not be *live*-executed
against remote (no non-management profile exists in this environment to
prove it with, and fabricating one requires the still-absent
`SUPABASE_SERVICE_ROLE_KEY`) — the fix's correctness instead rests on
direct reasoning about `has_role()`'s semantics (`current_user_role()`
reads the caller's *current*, pre-update role via `auth.uid()`, so a
caller attempting to set their own `role` to `'management'` is evaluated
against their real current role and correctly blocked) plus the RLS/GRANT
inspection that established the hole in the first place.

### 22.2 Verified working (live, this session)

- Every `page.tsx`/`actions.ts` under `/management`, `/faculty`, `/student`
  has an explicit `requireRole()`/`requireProfile()`/`requireAuth()` call
  (grepped exhaustively — the only `"use server"` file with none is
  `app/login/actions.ts`'s `login`/`logout`, correctly unauthenticated by
  design).
- `lib/supabase/admin.ts` is imported by exactly one file
  (`lib/management/accounts.ts`), which is not a Client Component; no
  `SUPABASE_SERVICE_ROLE_KEY`/`createAdminClient` string appears anywhere
  in `.next/static` client output (re-confirmed this session).
- Faculty offering authorization (`course_offering_faculty` via
  `isFacultyAssignedToOffering`) is enforced server-side, independently, at
  every layer that matters: `requireOwnedOffering()` in
  `app/faculty/courses/actions.ts` (every mutation), and
  `getFacultyOfferingDetail()` in `lib/academic/faculty-courses.ts` (every
  read) — not just RLS, not just hidden UI links. The
  `[offeringId]/sessions/[sessionId]` route additionally cross-checks
  `session.course_offering_id === offeringId`, closing a same-faculty,
  cross-offering session-id IDOR that would otherwise be possible.
  Attendance/grade submission re-fetches the real roster server-side
  rather than trusting submitted enrollment ids from the form.
- Student portal pages (`/student`, `/student/courses`,
  `/student/degree-progress`, `/student/progress/[milestoneId]`) never
  read a student id from a URL param or query string — `studentId` always
  comes from `getCurrentStudentId(profile.id)` (session-derived). A
  `?studentId=<other>` query string is structurally inert; there is no
  code path that would ever read it.
- Result-revision immutability (live-tested this session, see §22.4 for
  what was deliberately not tested): a metadata-only `results` UPDATE
  (e.g. `remarks`) creates zero revision rows; a direct `INSERT` into
  `result_revisions` is rejected (no insert policy for any role); a direct
  `DELETE` affects zero rows (no delete policy for any role, including
  management).
- Notifications: `notifyIfLinked()`'s profile-less no-op path — confirmed
  the exact precondition it guards (`students.profile_id IS NULL`) is real
  or a throwaway fixture, not assumed.
- No duplicate implementation exists for degree-audit/GPA, academic
  status, notifications, account-linking, role authorization, student/
  faculty identity resolution, faculty-offering authorization, or
  milestone sync — each resolves to exactly one file (grepped
  exhaustively across `lib/` and `app/`).
- `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass clean.

### 22.3 Verified — a soft-404, not a security defect (understood, not "fixed")

`/management/students/[id]` (and every other dynamic-segment route with a
sibling `loading.tsx`) returns HTTP `200` for a syntactically valid but
nonexistent id, not `404` — but renders genuine "not found" content (no
data leak; confirmed by inspecting the actual RSC payload, not just the
status code) with a `noindex` meta tag. Root cause, confirmed against this
exact Next.js version's own docs
(`node_modules/next/dist/docs/.../loading.md`, "Status Codes" section):
a `loading.tsx` file automatically wraps its `page.tsx` in an implicit
`<Suspense>` boundary; once that boundary starts streaming, the response
has already committed to a `200` status, and `notFound()` — called inside
that streamed content — cannot retroactively change it. This is
documented, intentional Next.js behavior, not a bug in this app. The
docs' own suggested fix (run the existence check in `proxy`, before any
streaming starts) directly conflicts with this project's own established
principle (`lib/supabase/middleware.ts`: "Next.js's own guidance is to
avoid database reads in Proxy"), and the alternative (removing
`loading.tsx`) sacrifices the loading-skeleton UX on every affected route
for a cosmetic status-code correction. Left as-is: classified as low-
severity technical debt (HTTP semantics only), not a security finding —
no unauthorized data is exposed, and status-code ambiguity in this
direction (always 200, never distinguishing "exists" from "doesn't") does
not create an existence oracle. Confirmed structurally identical `[id]`
routes across the app share this same trade-off (any dynamic segment with
a `loading.tsx` sibling); not enumerated file-by-file since the root cause
and fix trade-off are identical everywhere it occurs.

### 22.4 Verified but blocked from full E2E testing

- The actual invite → Auth-user-creation → profile-insert → link →
  password-set → login → portal-redirect sequence: `SUPABASE_SERVICE_ROLE_KEY`
  is still absent from `.env.local` (checked again this session — presence
  only, value never read/printed). No student/faculty Supabase Auth
  account exists in this environment to test role isolation *as* a
  student or faculty user (`profiles` count = 1, the management account
  only) — every "student/faculty must be rejected from management" /
  "student must not see another student's data" check was therefore
  verified by code inspection (identity resolution is always
  session-derived, never URL-derived — see §22.2) rather than by an actual
  cross-account live attempt, since no second account exists to attempt it
  with.
- The `result_revisions` marks/grade/grade_point UPDATE branch itself
  (exactly-one-row-created, before/after values, `changed_by`) was **not**
  re-exercised live this session. Reason: `result_revisions.result_id`
  references `results(id) ON DELETE RESTRICT`, and `results.enrollment_id`
  references `enrollments(id) ON DELETE RESTRICT` (confirmed by reading
  the schema fresh this audit) — the moment a real revision row is
  created, its parent `results` row, and transitively its `enrollments`
  row, become permanently undeletable by any role, including management.
  This is the same trap already documented in the Phase 8D addendum, and
  this audit's own "do not create permanent unwanted history" instruction
  takes precedence over re-proving a code path that is unchanged since
  Phase 8B's original (rolled-back, local-transaction) verification. Only
  the immutability guarantees (insert/delete rejection, metadata-only
  updates correctly ignored) were re-tested live this session, using a
  result that was never given a grade-changing update and so stayed fully
  deletable in cleanup.
- Faculty end-to-end (session creation → attendance → grades →
  publication → student notification → student-side visibility): blocked
  for the same no-second-account reason above. The authorization
  boundaries this workflow depends on (`requireOwnedOffering`,
  `isFacultyAssignedToOffering`, roster re-fetching) were verified by code
  inspection (§22.2), not a live click-through as a faculty user.

### 22.5 Institutional-data blockers (unchanged, restated for this audit)

Curriculum requirements (compulsory/elective assignments) and the grading
scale remain unconfigured for every real program (0 rows in
`curriculum_requirements`/`grading_scale` outside throwaway test fixtures,
confirmed this session) — by design, since NCEG hasn't supplied this data.
The PhD 24-vs-48 credit-hour-by-entry-basis rule, any repeat/improvement
GPA policy, and a controlled workflow for editing a *published* result
(flagged, unresolved, since Phase 8D) all remain explicitly unimplemented
rather than guessed at.
