import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DOCUMENT_BUCKET } from "./storage";

/** Shared progress vocabulary — see docs/database-design.md §15.6. */
export const DOCUMENT_SUBMISSION_STATUSES = [
  "not_started",
  "pending",
  "in_progress",
  "submitted",
  "under_review",
  "approved",
  "corrections_required",
  "completed",
  "overdue",
  "waived",
  "not_applicable",
] as const;
export type DocumentSubmissionStatus = (typeof DOCUMENT_SUBMISSION_STATUSES)[number];

export interface DocumentRequirementRow {
  id: string;
  document_name: string;
  description: string | null;
  required: boolean;
  milestone_template_id: string | null;
}

/** Requirements tied to a specific milestone template (e.g. what ASRB Presentation needs). */
export async function getDocumentRequirementsForMilestone(
  milestoneTemplateId: string
): Promise<DocumentRequirementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requirements")
    .select("id, document_name, description, required, milestone_template_id")
    .eq("milestone_template_id", milestoneTemplateId);

  if (error) {
    console.error("getDocumentRequirementsForMilestone failed:", error);
    return [];
  }
  return (data ?? []) as DocumentRequirementRow[];
}

/** Requirements scoped generically by degree_level/program rather than a specific milestone. */
export async function getDocumentRequirementsForDegreeLevel(
  degreeLevel: string
): Promise<DocumentRequirementRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requirements")
    .select("id, document_name, description, required, milestone_template_id")
    .eq("degree_level", degreeLevel);

  if (error) {
    console.error("getDocumentRequirementsForDegreeLevel failed:", error);
    return [];
  }
  return (data ?? []) as DocumentRequirementRow[];
}

export interface DocumentSubmissionRow {
  id: string;
  document_requirement_id: string;
  milestone_id: string | null;
  file_path: string;
  original_filename: string;
  version: number;
  status: DocumentSubmissionStatus;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
  remarks: string | null;
  requirement: { document_name: string } | null;
}

/**
 * All submissions for a student. file_path is a Supabase Storage
 * reference (bucket/object path), never a file payload — see the
 * document_submissions.file_path column comment in the Phase 3 migration.
 * Turning file_path into a signed download URL is left to the caller
 * (e.g. via supabase.storage.from(bucket).createSignedUrl()) — this
 * module only reads the reference.
 */
export async function getDocumentSubmissionsForStudent(studentId: string): Promise<DocumentSubmissionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(
      `
      id,
      document_requirement_id,
      milestone_id,
      file_path,
      original_filename,
      version,
      status,
      submitted_at,
      verified_at,
      verified_by,
      remarks,
      requirement:document_requirements ( document_name )
    `
    )
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("getDocumentSubmissionsForStudent failed:", error);
    return [];
  }
  return (data ?? []) as unknown as DocumentSubmissionRow[];
}

/**
 * Short-lived signed URL for a private Storage object. Goes through the
 * caller's own authenticated server client, so storage.objects RLS
 * (academic_documents_select_authenticated) is the actual gate — this
 * function does not itself check who is asking, same convention as every
 * other lib/academic read function. Returns null (not a thrown error) if
 * the caller isn't allowed to read the object or it doesn't exist, so
 * callers can render a plain "unavailable" state instead of crashing.
 */
export async function getSignedDocumentUrl(filePath: string, expiresInSeconds = 300): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(filePath, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
