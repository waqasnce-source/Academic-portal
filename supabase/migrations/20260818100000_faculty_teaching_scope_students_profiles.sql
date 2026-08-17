-- Fix: faculty coursework roster/attendance/grading silently empty for any
-- taught-but-not-supervised student.
--
-- Found during a live E2E verification pass: getOfferingRoster() and
-- getSessionRoster() (lib/academic/faculty-courses.ts) both embed
-- `student:students!inner(...)`. PostgREST enforces RLS on every joined
-- table independently, and students_select_authenticated's faculty branch
-- only grants visibility via an active supervisor_assignments row (a
-- research-supervision relationship, added in
-- 20260815090000_phase5_rls_hardening.sql) -- it has no branch for the
-- teaching relationship (course_offering_faculty), unlike its sibling
-- policies (enrollments_select_authenticated, attendance_select_authenticated,
-- results_select_authenticated), which all correctly include one. Because
-- the embed is `!inner` (not a plain left-join-style embed), a failed RLS
-- check on the nested `students` row drops the entire enrollment row, not
-- just the nested field -- so the roster, attendance-taking, and
-- grade-entry pages all render as if zero students are enrolled, for any
-- student without an active supervisor link to that specific faculty
-- member. This is the normal case for ordinary coursework (supervision is
-- a research relationship, not implied by teaching a course), so this
-- silently broke the entire Phase 8D faculty coursework workflow for the
-- common case. Verified live: ground-truth data (enrollment, faculty
-- assignment, both profile links) was confirmed correct via the
-- service-role client; the empty roster was reproduced in the actual app
-- UI; pg_policies inspection confirmed the missing branch.
--
-- The identical gap exists on profiles_select_faculty_supervisee (added in
-- the same Phase 5 migration, same reasoning, same missing branch) -- lower
-- severity there since the nested `profile:profiles(...)` embed in
-- getOfferingRoster()/getSessionRoster() is a plain embed, not `!inner`, so
-- the existing `profile?.full_name ?? name` fallback (established in Phase
-- 8B/8C for the nullable-profile_id case) masks it with the student's own
-- `name` column rather than dropping the row -- but it's the same class of
-- bug and is fixed here for the same reason and with the same pattern.
--
-- Both additions below are new, purely additive permissive SELECT
-- policies -- multiple permissive policies for the same command are
-- combined with OR, so this cannot narrow or conflict with any existing
-- grant; it only adds the one teaching-scoped case that was missing,
-- mirroring the exact course_offering_faculty-scoping pattern already
-- proven correct on enrollments/attendance/results. No enrollment-status
-- filter is applied, matching enrollments_select_authenticated's own
-- teaching branch (which also doesn't filter by status).

create policy "students_select_faculty_taught"
  on public.students
  as permissive
  for select
  to authenticated
  using (
    public.get_my_role() = 'faculty'
    and exists (
      select 1
      from public.enrollments e
      join public.course_offering_faculty cof on cof.course_offering_id = e.course_offering_id
      where e.student_id = students.id
        and cof.faculty_id = public.get_my_faculty_id()
    )
  );

create policy "profiles_select_faculty_taught"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (
    public.get_my_role() = 'faculty'
    and exists (
      select 1
      from public.students s
      join public.enrollments e on e.student_id = s.id
      join public.course_offering_faculty cof on cof.course_offering_id = e.course_offering_id
      where s.profile_id = profiles.id
        and cof.faculty_id = public.get_my_faculty_id()
    )
  );
