/**
 * Client-safe Storage constants/helpers for the academic-documents bucket
 * (supabase/migrations/20260815091500_document_storage_bucket.sql). No
 * "server-only" import — this is used from both the student upload Client
 * Component (direct browser upload; RLS on storage.objects is the actual
 * enforcement, see the bucket migration) and server-side code. Keep these
 * values in sync with that migration's bucket config if either changes.
 */

export const DOCUMENT_BUCKET = "academic-documents";

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
] as const;

export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Path convention: {student_id}/{document_requirement_id}/{version}_{filename}.
 * storage.objects RLS (academic_documents_*_authenticated policies) trusts
 * this first path segment as the owning student_id — it is never taken
 * from client input at the RLS layer; the policy re-derives the caller's
 * own student_id server-side via get_my_student_id() and compares. The
 * studentId passed in here should always be one the calling Server
 * Component already resolved from the authenticated session (e.g. via
 * getCurrentStudentId()), never a raw value read from the browser.
 */
export function buildDocumentStoragePath(
  studentId: string,
  documentRequirementId: string,
  version: number,
  originalFilename: string
): string {
  const safeName = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150) || "file";
  return `${studentId}/${documentRequirementId}/${version}_${safeName}`;
}
