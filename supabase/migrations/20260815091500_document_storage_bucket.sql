-- Academic Portal — Phase 5: Supabase Storage bucket for document uploads
--
-- Not a public-schema table/column change — this is Storage subsystem
-- configuration, required because Phase 5 section A ("Student: ... upload
-- permitted documents") is not implementable at all without somewhere to
-- put the files. document_submissions.file_path has always been a
-- Storage reference by design (see its column comment in the Phase 3
-- migration: "never a file payload") — this migration is what makes that
-- reference resolvable.
--
-- Private bucket (public = false): every read goes through RLS below via
-- the authenticated client, never a public URL. 10 MB per-file limit and
-- an explicit MIME allow-list are conservative, sensible defaults for
-- academic documents (PDFs and common office formats) — not specified in
-- any brief, so kept intentionally narrow rather than wide open; Management
-- can revisit if a legitimate format is missing.
--
-- Path convention (enforced by the app, not the database):
--   {student_id}/{document_requirement_id}/{version}_{original_filename}
-- RLS below extracts student_id from the path via storage.foldername(name)
-- and cross-references students/supervisor_assignments — the identical
-- authorization model already used for every Phase 3/4 academic-progress
-- table, applied here to Storage instead of a public-schema table.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'academic-documents',
  'academic-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do nothing;

-- ---- SELECT: management, the owning student, or an active supervisor ----

create policy "academic_documents_select_authenticated"
  on storage.objects
  as permissive
  for select
  to authenticated
  using (
    bucket_id = 'academic-documents'
    and (
      public.has_role('management')
      or (storage.foldername(name))[1] = (public.get_my_student_id())::text
      or (
        public.get_my_role() = 'faculty'
        and exists (
          select 1 from public.supervisor_assignments sa
          where sa.student_id::text = (storage.foldername(name))[1]
            and sa.faculty_id = public.get_my_faculty_id()
            and sa.status = 'active'
        )
      )
    )
  );

-- ---- INSERT: the owning student (own folder only), or management ----

create policy "academic_documents_insert_authenticated"
  on storage.objects
  as permissive
  for insert
  to authenticated
  with check (
    bucket_id = 'academic-documents'
    and (
      public.has_role('management')
      or (storage.foldername(name))[1] = (public.get_my_student_id())::text
    )
  );

-- No UPDATE or DELETE policy is added deliberately: an uploaded file is
-- immutable. A correction/resubmission is always a new object at a new
-- (version-numbered) path plus a new document_submissions row — never an
-- overwrite — so prior submitted files remain permanently retrievable,
-- matching the "do not destroy history" requirement.
