-- Fix: faculty can never successfully notify a student, even though
-- app/faculty/courses/actions.ts's publishResultAction() has always called
-- notifyIfLinked() on grade publication (Phase 8D). notifications only had
-- notifications_insert_management (with_check: has_role('management')) --
-- every other notifyIfLinked() call site is a management action
-- (enrollments/extensions/documents/thesis/research-proposals actions), so
-- this is the one faculty-triggered call, and it was never given a
-- matching grant. notifyIfLinked() swallows the resulting RLS error and
-- logs it (by design -- "never blocks the workflow action it's called
-- from"), so this failed silently on every result publication. Found
-- during the same live E2E verification pass as the previous two fixes:
-- publishing a result for the test student produced zero rows in
-- `notifications`, confirmed directly against the database.
--
-- New, purely additive INSERT policy -- multiple permissive policies for
-- the same command are combined with OR, so this cannot narrow the
-- existing management grant. Scoped tightly to notifyIfLinked's actual
-- shape: a faculty member may insert a notification only targeting a
-- student they teach (reusing is_student_taught_by_current_faculty(),
-- added in 20260818110000, for the same RLS-recursion-safety reason as
-- there), not an arbitrary profile_id.

create policy "notifications_insert_faculty_taught_student"
  on public.notifications
  as permissive
  for insert
  to authenticated
  with check (
    public.get_my_role() = 'faculty'
    and exists (
      select 1
      from public.students s
      where s.profile_id = notifications.profile_id
        and public.is_student_taught_by_current_faculty(s.id)
    )
  );
