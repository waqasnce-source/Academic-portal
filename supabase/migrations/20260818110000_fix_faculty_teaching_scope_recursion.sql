-- Fixes infinite-recursion bug (Postgres 42P17) introduced by the previous
-- migration (20260818100000_faculty_teaching_scope_students_profiles.sql),
-- found and fixed within the same E2E verification session, before that
-- migration had been relied on by anything.
--
-- students_select_faculty_taught read `enrollments` directly inline. But
-- enrollments_select_authenticated's own self-access branch reads
-- `students` back (`EXISTS (SELECT 1 FROM students s WHERE s.id =
-- enrollments.student_id AND s.profile_id = auth.uid())`) -- so evaluating
-- a `students` row triggered `enrollments` RLS, which triggered `students`
-- RLS again, looping forever. The sibling policies this migration was
-- modeled on (enrollments/attendance/results' own teaching branches) avoid
-- this because they join straight to course_offering_faculty/faculty and
-- never route back through `students` -- students_select_faculty_taught
-- is the only one of these that needed to join through `enrollments` to
-- reach course_offering_faculty, which is what created the cycle.
--
-- Fix: follow the same pattern already used throughout this schema
-- (get_my_faculty_id, get_my_role, has_role, get_my_student_id) --
-- encapsulate the cross-table check in a STABLE SECURITY DEFINER function.
-- Such a function executes with the privileges of its owner, so its
-- internal read of `enrollments`/`course_offering_faculty` does not
-- re-trigger RLS on those tables (identical to how get_my_faculty_id()
-- reads `faculty` without recursing into faculty's own policies) --
-- breaking the cycle while keeping the exact same authorization semantics.

create function public.is_student_taught_by_current_faculty(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.course_offering_faculty cof on cof.course_offering_id = e.course_offering_id
    where e.student_id = target_student_id
      and cof.faculty_id = public.get_my_faculty_id()
  );
$$;

comment on function public.is_student_taught_by_current_faculty(uuid) is
  'STABLE SECURITY DEFINER so its internal enrollments/course_offering_faculty read bypasses RLS on those tables -- required to let students_select_faculty_taught/profiles_select_faculty_taught check the teaching relationship without recursing back through enrollments_select_authenticated''s own students-reading branch. See migration header for the recursion this fixes.';

drop policy "students_select_faculty_taught" on public.students;
create policy "students_select_faculty_taught"
  on public.students
  as permissive
  for select
  to authenticated
  using (
    public.get_my_role() = 'faculty'
    and public.is_student_taught_by_current_faculty(students.id)
  );

drop policy "profiles_select_faculty_taught" on public.profiles;
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
      where s.profile_id = profiles.id
        and public.is_student_taught_by_current_faculty(s.id)
    )
  );
