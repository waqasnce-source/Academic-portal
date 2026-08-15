"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DOCUMENT_BUCKET,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  buildDocumentStoragePath,
} from "@/lib/academic/storage";

/**
 * Uploads directly from the browser to Supabase Storage, then inserts the
 * document_submissions row — both operations go through the browser
 * client, so storage.objects RLS and document_submissions_student_insert
 * (see the Phase 5 RLS migration) are the actual enforcement, not this
 * component. studentId is never taken from anything the user can edit —
 * it is passed down from the Server Component page, which resolved it
 * itself via getCurrentStudentId(profile.id) against the authenticated
 * session. A malicious client could still try to pass a different
 * studentId in a crafted request, but both RLS policies independently
 * re-derive the caller's own student_id (get_my_student_id()) and would
 * reject the mismatch regardless of what this component sends.
 */
export function DocumentUploadForm({
  studentId,
  documentRequirementId,
  milestoneRecordId,
  nextVersion,
}: {
  studentId: string;
  documentRequirementId: string;
  milestoneRecordId: string | null;
  nextVersion: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setError("Please choose a file.");
      return;
    }
    if (file.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      setError("File is too large (10 MB limit).");
      return;
    }
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Unsupported file type. Allowed: PDF, Word, JPEG, PNG.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const path = buildDocumentStoragePath(studentId, documentRequirementId, nextVersion, file.name);

      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        setError("Upload failed. Please try again.");
        return;
      }

      const { error: insertError } = await supabase.from("document_submissions").insert({
        student_id: studentId,
        document_requirement_id: documentRequirementId,
        milestone_id: milestoneRecordId,
        file_path: path,
        original_filename: file.name,
        version: nextVersion,
        status: "submitted",
      });
      if (insertError) {
        setError("Could not record the submission. Please try again.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`file-${documentRequirementId}`} className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {nextVersion > 1 ? "Resubmit corrected file" : "Upload file"}
        </label>
        <input
          id={`file-${documentRequirementId}`}
          name="file"
          type="file"
          accept={ALLOWED_DOCUMENT_MIME_TYPES.join(",")}
          className="text-sm text-zinc-700 dark:text-zinc-300"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Uploading..." : nextVersion > 1 ? "Resubmit" : "Submit"}
      </button>
      {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
