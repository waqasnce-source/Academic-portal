-- Academic Portal — Phase 5: RLS hardening + document-upload policy
--
-- Item J of the Phase 5 brief requires an RLS audit before implementing
-- workflow mutations. This migration is the result of that audit. Three
-- changes, all either a narrowing (least privilege) or a correctly-scoped
-- addition — nothing here weakens existing security.
--
-- ============================================================
-- 1. students_select_authenticated — narrowed
-- ============================================================
--
-- Flagged in the Phase 2 report and twice since: this policy let ANY
-- authenticated faculty member read EVERY student row, not just their own
-- supervisees — directly contradicting the spec's "Faculty: can read
-- students assigned to them" and the least-privilege standard already
-- applied to every Phase 3 table via supervisor_assignments-scoped
-- policies. Replaced with the same scoping pattern used everywhere else
-- in Phase 3 (e.g. document_submissions_select_authenticated).
--
-- Management and self-access (a student reading their own row) are
-- unchanged.

drop policy "students_select_authenticated" on public.students;

create policy "students_select_authenticated"
  on public.students
  as permissive
  for select
  to authenticated
  using (
    public.has_role('management')
    or profile_id = auth.uid()
    or (
      public.get_my_role() = 'faculty'
      and exists (
        select 1 from public.supervisor_assignments sa
        where sa.student_id = students.id
          and sa.faculty_id = public.get_my_faculty_id()
          and sa.status = 'active'
      )
    )
  );

-- ============================================================
-- 2. profiles_select_faculty_supervisee — new, additive
-- ============================================================
--
-- Genuine bug found during the audit, not merely a hardening: profiles
-- has NEVER had a faculty-read policy of any kind (only
-- has_role('management') or self). Every Phase 4 faculty page that reads
-- a supervisee's profiles.full_name/email via an embedded join (e.g.
-- getStudentProfileSummary, getActiveSuperviseesForFaculty) has silently
-- gotten `profile: null` back for any caller who is faculty, because
-- PostgREST enforces the EMBEDDED table's own RLS, not the parent
-- query's. This was never caught in Phase 4 testing because no real
-- faculty account existed to exercise it live (documented as a testing
-- limitation in the Phase 4 report). Scoped identically to the
-- students.id check above — a faculty member may read a profile only if
-- that profile belongs to one of their own active supervisees.

create policy "profiles_select_faculty_supervisee"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (
    public.get_my_role() = 'faculty'
    and exists (
      select 1
      from public.students s
      join public.supervisor_assignments sa on sa.student_id = s.id
      where s.profile_id = profiles.id
        and sa.faculty_id = public.get_my_faculty_id()
        and sa.status = 'active'
    )
  );

-- ============================================================
-- 3. document_submissions_student_insert — new, additive
-- ============================================================
--
-- Required for Phase 5 section A ("Student: ... upload permitted
-- documents"). Phase 3 deliberately left every write on this table
-- management-only, noting student upload was deferred to "the phase that
-- builds the corresponding UI workflow" — this is that phase.
--
-- A student may only insert a submission for themselves
-- (student_id = get_my_student_id()), and only in the 'submitted' state
-- with no verification fields set — a student cannot self-approve or
-- backdate a verification via a crafted request. Resubmission after a
-- correction is always a NEW row (a new, server-computed version number),
-- never an UPDATE of an existing row — no student UPDATE/DELETE policy is
-- added, so review history (status, remarks, verified_by/at per version)
-- can never be overwritten or destroyed by the student who submitted it.
-- Accept/reject/request-correction remain exclusively management actions
-- via the existing document_submissions_update_management policy.

create policy "document_submissions_student_insert"
  on public.document_submissions
  as permissive
  for insert
  to authenticated
  with check (
    student_id = public.get_my_student_id()
    and status = 'submitted'
    and verified_at is null
    and verified_by is null
  );
