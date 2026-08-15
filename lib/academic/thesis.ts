import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STUDENT_MILESTONE_STATUSES, THESIS_REVIEWER_TYPES, type ThesisReviewerType } from "./status-enums";

/** Shared progress vocabulary — see docs/database-design.md §15.6. */
export const THESIS_STAGE_STATUSES = STUDENT_MILESTONE_STATUSES;
export type ThesisStageStatus = (typeof THESIS_STAGE_STATUSES)[number];

export { THESIS_REVIEWER_TYPES, type ThesisReviewerType };

export interface ThesisRecordRow {
  id: string;
  research_project_id: string | null;
  submission_date: string | null;
  thesis_title: string | null;
  status: ThesisStageStatus | null;
  plagiarism_certificate_path: string | null;
  clearance_status: string | null;
  remarks: string | null;
}

export async function getThesisRecordForStudent(studentId: string): Promise<ThesisRecordRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_records")
    .select(
      "id, research_project_id, submission_date, thesis_title, status, plagiarism_certificate_path, clearance_status, remarks"
    )
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("getThesisRecordForStudent failed:", error);
    return null;
  }
  return data as ThesisRecordRow | null;
}

export interface ThesisReviewerRow {
  id: string;
  reviewer_name: string;
  reviewer_type: ThesisReviewerType;
  affiliation: string | null;
  country: string | null;
  status: string | null;
  comments: string | null;
}

/**
 * Reviewer identity is visible to the owning student under current RLS
 * (thesis_reviewers_select_authenticated) — flagged in the Phase 3 report
 * as a point some institutions handle as blind review. Implemented as
 * literally specified; narrowing this is a policy change, not a change
 * to this read function.
 */
export async function getThesisReviewers(thesisId: string): Promise<ThesisReviewerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_reviewers")
    .select("id, reviewer_name, reviewer_type, affiliation, country, status, comments")
    .eq("thesis_id", thesisId);

  if (error) {
    console.error("getThesisReviewers failed:", error);
    return [];
  }
  return (data ?? []) as ThesisReviewerRow[];
}

export interface ThesisReviewRow {
  id: string;
  reviewer_id: string;
  received_date: string | null;
  recommendation: string | null;
  comments: string | null;
  report_path: string | null;
}

export async function getThesisReviews(thesisId: string): Promise<ThesisReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_reviews")
    .select("id, reviewer_id, received_date, recommendation, comments, report_path")
    .eq("thesis_id", thesisId);

  if (error) {
    console.error("getThesisReviews failed:", error);
    return [];
  }
  return (data ?? []) as ThesisReviewRow[];
}

export interface ThesisCorrectionRow {
  id: string;
  submitted_date: string | null;
  correction_certificate_path: string | null;
  reply_to_comments_path: string | null;
  status: ThesisStageStatus | null;
  approved_date: string | null;
  remarks: string | null;
}

export async function getThesisCorrections(thesisId: string): Promise<ThesisCorrectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_corrections")
    .select("id, submitted_date, correction_certificate_path, reply_to_comments_path, status, approved_date, remarks")
    .eq("thesis_id", thesisId)
    .order("submitted_date", { ascending: false });

  if (error) {
    console.error("getThesisCorrections failed:", error);
    return [];
  }
  return (data ?? []) as ThesisCorrectionRow[];
}

export interface VivaExaminationRow {
  id: string;
  scheduled_date: string | null;
  actual_date: string | null;
  status: string | null;
  result: string | null;
  examiner_comments: string | null;
}

/** No vocabulary was supplied for status/result — see the Phase 3 migration's column comments. */
export async function getVivaExaminationForStudent(studentId: string): Promise<VivaExaminationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("viva_examinations")
    .select("id, scheduled_date, actual_date, status, result, examiner_comments")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("getVivaExaminationForStudent failed:", error);
    return null;
  }
  return data as VivaExaminationRow | null;
}

export interface ResultDeclarationRow {
  id: string;
  declaration_date: string | null;
  status: string | null;
  clearance_uop: boolean;
  clearance_nceg: boolean;
  library_submission: boolean;
  it_submission: boolean;
  secrecy_submission: boolean;
  examiner_fee_status: string | null;
  transcript_status: string | null;
  remarks: string | null;
}

export async function getResultDeclarationForStudent(studentId: string): Promise<ResultDeclarationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("result_declarations")
    .select(
      "id, declaration_date, status, clearance_uop, clearance_nceg, library_submission, it_submission, secrecy_submission, examiner_fee_status, transcript_status, remarks"
    )
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("getResultDeclarationForStudent failed:", error);
    return null;
  }
  return data as ResultDeclarationRow | null;
}
