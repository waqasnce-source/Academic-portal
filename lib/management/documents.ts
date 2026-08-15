import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StudentMilestoneStatus } from "@/lib/academic/status-enums";

export interface DocumentRequirementRow {
  id: string;
  document_name: string;
  description: string | null;
  required: boolean;
  degree_level: string | null;
  milestone: { title: string; degree_level: string } | null;
  program: { name: string } | null;
}

const DOCUMENT_REQUIREMENT_SELECT = `
  id,
  document_name,
  description,
  required,
  degree_level,
  milestone:milestone_templates ( title, degree_level ),
  program:programs ( name )
`;

export async function getDocumentRequirements(): Promise<{ data: DocumentRequirementRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_requirements")
    .select(DOCUMENT_REQUIREMENT_SELECT)
    .order("document_name", { ascending: true });

  if (error) {
    console.error("getDocumentRequirements failed:", error);
    return { data: [], error: "Could not load document requirements." };
  }
  return { data: (data ?? []) as unknown as DocumentRequirementRow[], error: null };
}

export const DOCUMENT_SUBMISSIONS_PAGE_SIZE = 25;

export interface DocumentSubmissionRow {
  id: string;
  original_filename: string;
  version: number;
  status: StudentMilestoneStatus;
  submitted_at: string;
  verified_at: string | null;
  student: { student_number: string; profile: { full_name: string } | null };
  requirement: { document_name: string };
}

const DOCUMENT_SUBMISSION_SELECT = `
  id,
  original_filename,
  version,
  status,
  submitted_at,
  verified_at,
  student:students!inner ( student_number, profile:profiles ( full_name ) ),
  requirement:document_requirements!inner ( document_name )
`;

export interface DocumentSubmissionDetail {
  id: string;
  student_id: string;
  document_requirement_id: string;
  file_path: string;
  original_filename: string;
  version: number;
  status: StudentMilestoneStatus;
  submitted_at: string;
  verified_at: string | null;
  verified_by: string | null;
  remarks: string | null;
  student: { id: string; student_number: string; profile: { full_name: string } | null };
  requirement: { document_name: string; description: string | null; required: boolean };
}

const DOCUMENT_SUBMISSION_DETAIL_SELECT = `
  id,
  student_id,
  document_requirement_id,
  file_path,
  original_filename,
  version,
  status,
  submitted_at,
  verified_at,
  verified_by,
  remarks,
  student:students!inner ( id, student_number, profile:profiles ( full_name ) ),
  requirement:document_requirements!inner ( document_name, description, required )
`;

export async function getDocumentSubmissionById(id: string): Promise<DocumentSubmissionDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(DOCUMENT_SUBMISSION_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as DocumentSubmissionDetail;
}

/**
 * All versions submitted for the same (student, requirement) pair as the
 * given submission — for showing the full resubmission history alongside
 * whichever version is currently being reviewed.
 */
export async function getDocumentSubmissionVersions(
  studentId: string,
  documentRequirementId: string
): Promise<DocumentSubmissionDetail[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(DOCUMENT_SUBMISSION_DETAIL_SELECT)
    .eq("student_id", studentId)
    .eq("document_requirement_id", documentRequirementId)
    .order("version", { ascending: false });

  if (error) {
    console.error("getDocumentSubmissionVersions failed:", error);
    return [];
  }
  return (data ?? []) as unknown as DocumentSubmissionDetail[];
}

/**
 * Only 'approved' (accept) and 'corrections_required' (request
 * correction) are implemented — the shared 11-value status vocabulary
 * (docs/database-design.md §15.6) has no distinct 'rejected' value, and
 * Phase 5's brief asks for "accept, reject, request correction" as three
 * separate outcomes. Adding a 'rejected' value would mean altering the
 * CHECK constraint shared by five tables (student_milestones,
 * research_proposals, thesis_records, thesis_corrections,
 * document_submissions) — flagged in the Phase 5 report as a schema
 * question for approval rather than decided here, per the explicit
 * instruction to stop before a genuinely-required schema change.
 */
export async function reviewDocumentSubmission(
  id: string,
  input: { status: "approved" | "corrections_required"; remarks: string | null; reviewerId: string }
) {
  const supabase = await createClient();
  return supabase
    .from("document_submissions")
    .update({
      status: input.status,
      remarks: input.remarks,
      verified_by: input.reviewerId,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function getRecentDocumentSubmissions(): Promise<{
  data: DocumentSubmissionRow[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_submissions")
    .select(DOCUMENT_SUBMISSION_SELECT)
    .order("submitted_at", { ascending: false })
    .limit(DOCUMENT_SUBMISSIONS_PAGE_SIZE);

  if (error) {
    console.error("getRecentDocumentSubmissions failed:", error);
    return { data: [], error: "Could not load document submissions." };
  }
  return { data: (data ?? []) as unknown as DocumentSubmissionRow[], error: null };
}
