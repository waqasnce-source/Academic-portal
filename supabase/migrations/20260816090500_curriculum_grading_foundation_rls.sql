-- Phase 8B — RLS for curriculum_requirements, grading_scale, and
-- result_revisions. Mirrors the exact structure established in
-- 20260814180500_academic_progress_tracking_rls.sql: blanket table-level
-- GRANT to anon/authenticated/service_role (RLS is the actual gate), one
-- policy per operation, faculty/student scoping reusing the existing
-- has_role / get_my_student_id / get_my_faculty_id / course_offering_faculty
-- mechanisms — no new scoping mechanism is introduced.
--
-- result_revisions deliberately gets NO insert/update/delete policy at
-- all: the only path that ever writes a row is trg_results_record_revision
-- (SECURITY DEFINER, so it bypasses RLS via table ownership regardless of
-- policies). With zero write policies, no authenticated role — including
-- management — can insert, update, or delete a revision directly through
-- the normal client. This is what makes the history genuinely immutable
-- rather than immutable "by convention".

alter table public.curriculum_requirements enable row level security;
alter table public.grading_scale enable row level security;
alter table public.result_revisions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['curriculum_requirements', 'grading_scale', 'result_revisions']
  loop
    execute format('grant select, insert, update, delete on table public.%I to anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end $$;

-- ============================================================
-- curriculum_requirements
-- ============================================================

create policy "curriculum_requirements_select_authenticated"
  on public.curriculum_requirements
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or public.has_role('faculty')
    or exists (
      select 1
      from public.students s
      where s.profile_id = auth.uid()
        and s.program_id = curriculum_requirements.program_id
        and (
          curriculum_requirements.specialization_id is null
          or curriculum_requirements.specialization_id = s.specialization_id
        )
    )
  );

comment on policy "curriculum_requirements_select_authenticated" on public.curriculum_requirements is
  'Management and faculty read all rows (reference/configuration data). A student reads only rows for their own program, further limited to rows with a null specialization_id (applies to everyone in the program) or matching their own specialization_id — never another specialization''s requirements.';

create policy "curriculum_requirements_insert_management"
  on public.curriculum_requirements
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "curriculum_requirements_update_management"
  on public.curriculum_requirements
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "curriculum_requirements_delete_management"
  on public.curriculum_requirements
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- grading_scale
-- ============================================================
--
-- Broad select for every authenticated user, same as courses/semesters/
-- program_courses (`using (true)`) — a student needs to be able to read
-- the scale to interpret their own grade, and it carries no
-- student-identifying data.

create policy "grading_scale_select_authenticated"
  on public.grading_scale
  as permissive
  for select
  to authenticated
  using (true);

create policy "grading_scale_insert_management"
  on public.grading_scale
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "grading_scale_update_management"
  on public.grading_scale
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "grading_scale_delete_management"
  on public.grading_scale
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- result_revisions — select-only (see migration header note)
-- ============================================================

create policy "result_revisions_select_authenticated"
  on public.result_revisions
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or (
      public.has_role('faculty')
      and exists (
        select 1
        from public.results r
        join public.enrollments e on e.id = r.enrollment_id
        join public.course_offering_faculty cof on cof.course_offering_id = e.course_offering_id
        where r.id = result_revisions.result_id
          and cof.faculty_id = public.get_my_faculty_id()
      )
    )
    or exists (
      select 1
      from public.results r
      join public.enrollments e on e.id = r.enrollment_id
      where r.id = result_revisions.result_id
        and e.student_id = public.get_my_student_id()
        and r.published_at is not null
    )
  );

comment on policy "result_revisions_select_authenticated" on public.result_revisions is
  'Management: all rows. Faculty: only revisions for results in offerings they are assigned to teach (via course_offering_faculty, the existing teaching-scope mechanism — never supervisor_assignments, which is a different relationship). Student: only revisions for their own enrollment, and only once the current result is published — mirrors results_select_authenticated''s own student gate exactly. NOTE: full-row access includes changed_by and reason (administrative context) — no column-level restriction exists yet; flagged in docs/database-design.md as a point to revisit before any student-facing revision-history UI is built.';
