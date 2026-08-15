-- Academic Portal — Phase 3: RLS + grants for the academic-progress tables
--
-- Mirrors the exact structure of 20260813152648_remote_schema.sql:
--   - blanket GRANT select/insert/update/delete to anon/authenticated/
--     service_role on every table (RLS is what actually restricts access;
--     "anon" ends up with no usable access because every policy below is
--     `to authenticated`)
--   - one *_select_authenticated policy per table (named for consistency
--     with existing tables even where the logic is row-scoped, not
--     literally open to every authenticated user)
--   - faculty write access follows the existing course_offering_faculty /
--     attendance_faculty_insert/update pattern: a single insert/update
--     policy per table whose WITH CHECK / USING clause is
--     `management OR (faculty AND <scoped via supervisor_assignments>)`
--
-- Does not modify any existing RLS policy on any existing table.
--
-- Faculty/student read scoping in every policy below goes through
-- supervisor_assignments (status = 'active'), never a blanket
-- has_role('faculty') the way students_select_authenticated does today —
-- this is deliberately narrower than that existing policy, per the
-- explicit Phase 3 instruction "Do NOT allow a faculty member to read
-- every student" for this new set of tables. (Whether the existing
-- students_select_authenticated policy itself should also be narrowed was
-- flagged as an open question in the Phase 2 report and is NOT changed
-- here — no existing policy is touched by this migration.)

alter table public.specializations enable row level security;
alter table public.supervisor_assignments enable row level security;
alter table public.milestone_templates enable row level security;
alter table public.student_milestones enable row level security;
alter table public.research_projects enable row level security;
alter table public.research_proposals enable row level security;
alter table public.document_requirements enable row level security;
alter table public.document_submissions enable row level security;
alter table public.extension_applications enable row level security;
alter table public.thesis_records enable row level security;
alter table public.thesis_reviewers enable row level security;
alter table public.thesis_reviews enable row level security;
alter table public.thesis_corrections enable row level security;
alter table public.viva_examinations enable row level security;
alter table public.result_declarations enable row level security;

-- ---- grants (table-level; RLS policies below are the actual gate) ----

do $$
declare
  t text;
begin
  foreach t in array array[
    'specializations', 'supervisor_assignments', 'milestone_templates',
    'student_milestones', 'research_projects', 'research_proposals',
    'document_requirements', 'document_submissions', 'extension_applications',
    'thesis_records', 'thesis_reviewers', 'thesis_reviews', 'thesis_corrections',
    'viva_examinations', 'result_declarations'
  ]
  loop
    execute format('grant select, insert, update, delete on table public.%I to anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end;
$$;

-- ============================================================
-- specializations — catalog data, same treatment as departments/programs
-- ============================================================

create policy "specializations_select_authenticated"
  on public.specializations
  as permissive
  for select
  to authenticated
  using (true);

create policy "specializations_insert_management"
  on public.specializations
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "specializations_update_management"
  on public.specializations
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "specializations_delete_management"
  on public.specializations
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- supervisor_assignments — management full CRUD; faculty/student read own
-- ============================================================

create policy "supervisor_assignments_select_authenticated"
  on public.supervisor_assignments
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or faculty_id = public.get_my_faculty_id()
    or student_id = public.get_my_student_id()
  );

create policy "supervisor_assignments_insert_management"
  on public.supervisor_assignments
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "supervisor_assignments_update_management"
  on public.supervisor_assignments
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "supervisor_assignments_delete_management"
  on public.supervisor_assignments
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- milestone_templates — configuration/catalog data
-- ============================================================

create policy "milestone_templates_select_authenticated"
  on public.milestone_templates
  as permissive
  for select
  to authenticated
  using (true);

create policy "milestone_templates_insert_management"
  on public.milestone_templates
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "milestone_templates_update_management"
  on public.milestone_templates
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "milestone_templates_delete_management"
  on public.milestone_templates
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- student_milestones — the one table given explicit faculty-write scope
-- ============================================================

create policy "student_milestones_select_authenticated"
  on public.student_milestones
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = student_milestones.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "student_milestones_faculty_insert"
  on public.student_milestones
  as permissive
  for insert
  to authenticated
  with check (
    public.get_my_role() = 'management'
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = student_milestones.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "student_milestones_faculty_update"
  on public.student_milestones
  as permissive
  for update
  to authenticated
  using (
    public.get_my_role() = 'management'
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = student_milestones.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  )
  with check (
    public.get_my_role() = 'management'
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = student_milestones.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "student_milestones_delete_management"
  on public.student_milestones
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- research_projects — student/faculty read-only in this phase
-- ============================================================

create policy "research_projects_select_authenticated"
  on public.research_projects
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = research_projects.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "research_projects_insert_management"
  on public.research_projects
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "research_projects_update_management"
  on public.research_projects
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "research_projects_delete_management"
  on public.research_projects
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- research_proposals — scoped via project_id -> research_projects.student_id
-- ============================================================

create policy "research_proposals_select_authenticated"
  on public.research_proposals
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or exists (
      select 1 from public.research_projects rp
      where rp.id = research_proposals.project_id
        and (
          rp.student_id = public.get_my_student_id()
          or (
            public.get_my_role() = 'faculty'
            and exists (
              select 1 from public.supervisor_assignments sa
              where sa.student_id = rp.student_id
                and sa.faculty_id = public.get_my_faculty_id()
                and sa.status = 'active'
            )
          )
        )
    )
  );

create policy "research_proposals_insert_management"
  on public.research_proposals
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "research_proposals_update_management"
  on public.research_proposals
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "research_proposals_delete_management"
  on public.research_proposals
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- document_requirements — configuration/catalog data
-- ============================================================

create policy "document_requirements_select_authenticated"
  on public.document_requirements
  as permissive
  for select
  to authenticated
  using (true);

create policy "document_requirements_insert_management"
  on public.document_requirements
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "document_requirements_update_management"
  on public.document_requirements
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "document_requirements_delete_management"
  on public.document_requirements
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- document_submissions — student/faculty read-only in this phase
-- ============================================================

create policy "document_submissions_select_authenticated"
  on public.document_submissions
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = document_submissions.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "document_submissions_insert_management"
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "document_submissions_update_management"
  on public.document_submissions
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "document_submissions_delete_management"
  on public.document_submissions
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- extension_applications — student/faculty read-only in this phase
-- ============================================================

create policy "extension_applications_select_authenticated"
  on public.extension_applications
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = extension_applications.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "extension_applications_insert_management"
  on public.extension_applications
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "extension_applications_update_management"
  on public.extension_applications
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "extension_applications_delete_management"
  on public.extension_applications
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- thesis_records — student_id direct column
-- ============================================================

create policy "thesis_records_select_authenticated"
  on public.thesis_records
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = thesis_records.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "thesis_records_insert_management"
  on public.thesis_records
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "thesis_records_update_management"
  on public.thesis_records
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "thesis_records_delete_management"
  on public.thesis_records
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- thesis_reviewers — scoped via thesis_id -> thesis_records.student_id
-- ============================================================
--
-- Reviewer identity (name/affiliation/country/email) is exposed to the
-- student under this policy, per the Phase 3 brief's literal instruction
-- that students may read their own "thesis" without a carve-out for
-- reviewer confidentiality. Flagged in the Phase 3 report as a point some
-- institutions handle as blind review — revisit if NCEG wants reviewer
-- identity hidden from the candidate.

create policy "thesis_reviewers_select_authenticated"
  on public.thesis_reviewers
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or exists (
      select 1 from public.thesis_records tr
      where tr.id = thesis_reviewers.thesis_id
        and (
          tr.student_id = public.get_my_student_id()
          or (
            public.get_my_role() = 'faculty'
            and exists (
              select 1 from public.supervisor_assignments sa
              where sa.student_id = tr.student_id
                and sa.faculty_id = public.get_my_faculty_id()
                and sa.status = 'active'
            )
          )
        )
    )
  );

create policy "thesis_reviewers_insert_management"
  on public.thesis_reviewers
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "thesis_reviewers_update_management"
  on public.thesis_reviewers
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "thesis_reviewers_delete_management"
  on public.thesis_reviewers
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- thesis_reviews — scoped via thesis_id -> thesis_records.student_id
-- ============================================================

create policy "thesis_reviews_select_authenticated"
  on public.thesis_reviews
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or exists (
      select 1 from public.thesis_records tr
      where tr.id = thesis_reviews.thesis_id
        and (
          tr.student_id = public.get_my_student_id()
          or (
            public.get_my_role() = 'faculty'
            and exists (
              select 1 from public.supervisor_assignments sa
              where sa.student_id = tr.student_id
                and sa.faculty_id = public.get_my_faculty_id()
                and sa.status = 'active'
            )
          )
        )
    )
  );

create policy "thesis_reviews_insert_management"
  on public.thesis_reviews
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "thesis_reviews_update_management"
  on public.thesis_reviews
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "thesis_reviews_delete_management"
  on public.thesis_reviews
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- thesis_corrections — scoped via thesis_id -> thesis_records.student_id
-- ============================================================

create policy "thesis_corrections_select_authenticated"
  on public.thesis_corrections
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or exists (
      select 1 from public.thesis_records tr
      where tr.id = thesis_corrections.thesis_id
        and (
          tr.student_id = public.get_my_student_id()
          or (
            public.get_my_role() = 'faculty'
            and exists (
              select 1 from public.supervisor_assignments sa
              where sa.student_id = tr.student_id
                and sa.faculty_id = public.get_my_faculty_id()
                and sa.status = 'active'
            )
          )
        )
    )
  );

create policy "thesis_corrections_insert_management"
  on public.thesis_corrections
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "thesis_corrections_update_management"
  on public.thesis_corrections
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "thesis_corrections_delete_management"
  on public.thesis_corrections
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- viva_examinations — student_id direct column
-- ============================================================

create policy "viva_examinations_select_authenticated"
  on public.viva_examinations
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = viva_examinations.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "viva_examinations_insert_management"
  on public.viva_examinations
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "viva_examinations_update_management"
  on public.viva_examinations
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "viva_examinations_delete_management"
  on public.viva_examinations
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));

-- ============================================================
-- result_declarations — student_id direct column
-- ============================================================

create policy "result_declarations_select_authenticated"
  on public.result_declarations
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or student_id = public.get_my_student_id()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = result_declarations.student_id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

create policy "result_declarations_insert_management"
  on public.result_declarations
  as permissive
  for insert
  to authenticated
  with check (public.has_role('management'));

create policy "result_declarations_update_management"
  on public.result_declarations
  as permissive
  for update
  to authenticated
  using (public.has_role('management'))
  with check (public.has_role('management'));

create policy "result_declarations_delete_management"
  on public.result_declarations
  as permissive
  for delete
  to authenticated
  using (public.has_role('management'));
