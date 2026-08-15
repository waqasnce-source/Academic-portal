import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STUDENT_MILESTONE_STATUSES, type StudentMilestoneStatus } from "@/lib/academic/status-enums";
import { THESIS_REVIEWER_TYPES, type ThesisReviewerType } from "@/lib/academic/thesis";

export { STUDENT_MILESTONE_STATUSES as THESIS_STAGE_STATUSES, THESIS_REVIEWER_TYPES };
export type { StudentMilestoneStatus as ThesisStageStatus, ThesisReviewerType };

export const THESIS_PAGE_SIZE = 25;

export interface ThesisRecordRow {
  id: string;
  thesis_title: string | null;
  submission_date: string | null;
  status: string | null;
  clearance_status: string | null;
  student: {
    student_number: string;
    profile: { full_name: string } | null;
    program: { name: string; degree_level: string } | null;
  };
}

const THESIS_RECORD_SELECT = `
  id,
  thesis_title,
  submission_date,
  status,
  clearance_status,
  student:students!inner (
    student_number,
    profile:profiles ( full_name ),
    program:programs ( name, degree_level )
  )
`;

export async function getThesisRecords(): Promise<{
  data: ThesisRecordRow[];
  count: number;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("thesis_records")
    .select(THESIS_RECORD_SELECT, { count: "exact" })
    .order("submission_date", { ascending: false, nullsFirst: false })
    .limit(THESIS_PAGE_SIZE);

  if (error) {
    console.error("getThesisRecords failed:", error);
    return { data: [], count: 0, error: "Could not load thesis records." };
  }
  return { data: (data ?? []) as unknown as ThesisRecordRow[], count: count ?? 0, error: null };
}

export interface ThesisRecordDetail {
  id: string;
  student_id: string;
  research_project_id: string | null;
  thesis_title: string | null;
  submission_date: string | null;
  status: StudentMilestoneStatus | null;
  plagiarism_certificate_path: string | null;
  clearance_status: string | null;
  remarks: string | null;
  student: { id: string; student_number: string; profile: { full_name: string } | null };
}

const THESIS_RECORD_DETAIL_SELECT = `
  id,
  student_id,
  research_project_id,
  thesis_title,
  submission_date,
  status,
  plagiarism_certificate_path,
  clearance_status,
  remarks,
  student:students!inner ( id, student_number, profile:profiles ( full_name ) )
`;

export async function getThesisRecordById(id: string): Promise<ThesisRecordDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_records")
    .select(THESIS_RECORD_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as ThesisRecordDetail;
}

/** One thesis_records row per student in practice — used to route "manage thesis" from a student's existing record, if any. */
export async function getThesisRecordForStudent(studentId: string): Promise<ThesisRecordDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_records")
    .select(THESIS_RECORD_DETAIL_SELECT)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as ThesisRecordDetail;
}

export interface ThesisRecordInput {
  student_id: string;
  research_project_id: string | null;
  thesis_title: string | null;
  submission_date: string | null;
  status: StudentMilestoneStatus | null;
  clearance_status: string | null;
  remarks: string | null;
}

export async function createThesisRecord(input: ThesisRecordInput) {
  const supabase = await createClient();
  return supabase.from("thesis_records").insert(input).select("id").single();
}

export async function updateThesisRecord(id: string, input: ThesisRecordInput) {
  const supabase = await createClient();
  return supabase.from("thesis_records").update(input).eq("id", id).select("id").single();
}

// ---- Reviewers ----

export interface ThesisReviewerRow {
  id: string;
  reviewer_name: string;
  reviewer_type: ThesisReviewerType;
  affiliation: string | null;
  country: string | null;
  email: string | null;
  status: string | null;
  comments: string | null;
}

export async function getThesisReviewersForThesis(thesisId: string): Promise<ThesisReviewerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_reviewers")
    .select("id, reviewer_name, reviewer_type, affiliation, country, email, status, comments")
    .eq("thesis_id", thesisId)
    .order("reviewer_type");

  if (error) {
    console.error("getThesisReviewersForThesis failed:", error);
    return [];
  }
  return (data ?? []) as ThesisReviewerRow[];
}

export async function addThesisReviewer(input: {
  thesis_id: string;
  reviewer_name: string;
  reviewer_type: ThesisReviewerType;
  affiliation: string | null;
  country: string | null;
  email: string | null;
}) {
  const supabase = await createClient();
  return supabase.from("thesis_reviewers").insert(input).select("id").single();
}

// ---- Reviews ----

export interface ThesisReviewRow {
  id: string;
  reviewer_id: string;
  received_date: string | null;
  recommendation: string | null;
  comments: string | null;
}

export async function getThesisReviewsForThesis(thesisId: string): Promise<ThesisReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_reviews")
    .select("id, reviewer_id, received_date, recommendation, comments")
    .eq("thesis_id", thesisId)
    .order("received_date", { ascending: false, nullsFirst: true });

  if (error) {
    console.error("getThesisReviewsForThesis failed:", error);
    return [];
  }
  return (data ?? []) as ThesisReviewRow[];
}

export async function addThesisReview(input: {
  thesis_id: string;
  reviewer_id: string;
  received_date: string | null;
  recommendation: string | null;
  comments: string | null;
}) {
  const supabase = await createClient();
  return supabase.from("thesis_reviews").insert(input).select("id").single();
}

// ---- Corrections ----

export interface ThesisCorrectionRow {
  id: string;
  submitted_date: string | null;
  status: StudentMilestoneStatus | null;
  approved_date: string | null;
  remarks: string | null;
}

export async function getThesisCorrectionsForThesis(thesisId: string): Promise<ThesisCorrectionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("thesis_corrections")
    .select("id, submitted_date, status, approved_date, remarks")
    .eq("thesis_id", thesisId)
    .order("submitted_date", { ascending: false, nullsFirst: true });

  if (error) {
    console.error("getThesisCorrectionsForThesis failed:", error);
    return [];
  }
  return (data ?? []) as ThesisCorrectionRow[];
}

export async function addThesisCorrection(input: {
  thesis_id: string;
  submitted_date: string | null;
  status: StudentMilestoneStatus;
  remarks: string | null;
}) {
  const supabase = await createClient();
  const isApproved = input.status === "approved" || input.status === "completed";
  return supabase
    .from("thesis_corrections")
    .insert({ ...input, approved_date: isApproved ? new Date().toISOString().slice(0, 10) : null })
    .select("id")
    .single();
}

// ---- Viva ----

export interface VivaExaminationRow {
  id: string;
  scheduled_date: string | null;
  actual_date: string | null;
  status: string | null;
  result: string | null;
  examiner_comments: string | null;
}

export async function getVivaExaminationForStudent(studentId: string): Promise<VivaExaminationRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("viva_examinations")
    .select("id, scheduled_date, actual_date, status, result, examiner_comments")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !data) return null;
  return data as VivaExaminationRow;
}

export interface VivaExaminationInput {
  student_id: string;
  thesis_id: string | null;
  scheduled_date: string | null;
  actual_date: string | null;
  status: string | null;
  result: string | null;
  examiner_comments: string | null;
}

export async function upsertVivaExamination(existingId: string | null, input: VivaExaminationInput) {
  const supabase = await createClient();
  if (existingId) {
    return supabase.from("viva_examinations").update(input).eq("id", existingId).select("id").single();
  }
  return supabase.from("viva_examinations").insert(input).select("id").single();
}

// ---- Result declaration ----

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

  if (error || !data) return null;
  return data as ResultDeclarationRow;
}

export interface ResultDeclarationInput {
  student_id: string;
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

export async function upsertResultDeclaration(existingId: string | null, input: ResultDeclarationInput) {
  const supabase = await createClient();
  if (existingId) {
    return supabase.from("result_declarations").update(input).eq("id", existingId).select("id").single();
  }
  return supabase.from("result_declarations").insert(input).select("id").single();
}
