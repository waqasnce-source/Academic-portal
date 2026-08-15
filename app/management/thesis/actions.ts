"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  THESIS_STAGE_STATUSES,
  THESIS_REVIEWER_TYPES,
  createThesisRecord,
  updateThesisRecord,
  getThesisRecordById,
  addThesisReviewer,
  addThesisReview,
  addThesisCorrection,
  upsertVivaExamination,
  upsertResultDeclaration,
  type ThesisStageStatus,
  type ThesisReviewerType,
} from "@/lib/management/thesis";
import { syncStudentMilestoneByCode } from "@/lib/academic/milestone-sync";
import { notifyIfLinked } from "@/lib/management/notifications";
import { getStudentById } from "@/lib/management/students";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const TODAY = () => new Date().toISOString().slice(0, 10);
const TERMINAL_GOOD = new Set(["completed", "approved", "waived", "not_applicable"]);

async function notifyStudent(studentId: string, title: string, message: string) {
  const student = await getStudentById(studentId);
  await notifyIfLinked(student?.profile_id ?? null, title, message);
}

export interface ThesisFormState {
  error?: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  thesis_records_student_id_fkey: "Selected student could not be found.",
  thesis_reviewers_thesis_id_fkey: "Thesis record could not be found.",
  thesis_reviewers_reviewer_type_check: "Reviewer type must be Foreign or National.",
  thesis_reviews_reviewer_id_fkey: "Selected reviewer could not be found.",
};

function parseOptionalStatus(formData: FormData, field: string): ThesisStageStatus | null {
  const raw = String(formData.get(field) ?? "").trim();
  return (THESIS_STAGE_STATUSES as readonly string[]).includes(raw) ? (raw as ThesisStageStatus) : null;
}

export async function createThesisRecordAction(
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!UUID_RE.test(studentId)) return { error: "Please select a student." };

  const title = String(formData.get("thesis_title") ?? "").trim();
  const status = parseOptionalStatus(formData, "status");

  const { error, data } = await createThesisRecord({
    student_id: studentId,
    research_project_id: null,
    thesis_title: title || null,
    submission_date: null,
    status,
    clearance_status: null,
    remarks: null,
  });
  if (error || !data) return { error: toUserMessage(error!, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/thesis");
  redirect(`/management/thesis/${data.id}`);
}

export async function updateThesisRecordAction(
  thesisId: string,
  studentId: string,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(thesisId)) return { error: "Invalid thesis record." };

  const title = String(formData.get("thesis_title") ?? "").trim();
  const submissionDate = String(formData.get("submission_date") ?? "").trim();
  const clearanceStatus = String(formData.get("clearance_status") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();
  const status = parseOptionalStatus(formData, "status");

  const { error } = await updateThesisRecord(thesisId, {
    student_id: studentId,
    research_project_id: null,
    thesis_title: title || null,
    submission_date: submissionDate || null,
    status,
    clearance_status: clearanceStatus || null,
    remarks: remarks || null,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  // status is drawn from the shared 11-value vocabulary (THESIS_STAGE_STATUSES
  // is STUDENT_MILESTONE_STATUSES re-exported), so it maps straight onto
  // student_milestones.status for the THESIS_SUBMISSION step.
  if (status) {
    await syncStudentMilestoneByCode(studentId, ["THESIS_SUBMISSION"], {
      status,
      due_date: submissionDate || undefined,
      ...(TERMINAL_GOOD.has(status) ? { completed_date: TODAY() } : {}),
    });
    await notifyStudent(studentId, "Thesis Status Update", `Your thesis status has been updated to "${status.replace(/_/g, " ")}".`);
  }

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}

export async function addThesisReviewerAction(
  thesisId: string,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(thesisId)) return { error: "Invalid thesis record." };

  const name = String(formData.get("reviewer_name") ?? "").trim();
  const rawType = String(formData.get("reviewer_type") ?? "").trim();
  if (!name) return { error: "Reviewer name is required." };
  if (!(THESIS_REVIEWER_TYPES as readonly string[]).includes(rawType)) {
    return { error: "Reviewer type must be Foreign or National." };
  }

  const affiliation = String(formData.get("affiliation") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  const { error } = await addThesisReviewer({
    thesis_id: thesisId,
    reviewer_name: name,
    reviewer_type: rawType as ThesisReviewerType,
    affiliation: affiliation || null,
    country: country || null,
    email: email || null,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}

export async function addThesisReviewAction(
  thesisId: string,
  reviewerId: string,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(thesisId) || !UUID_RE.test(reviewerId)) return { error: "Invalid request." };

  const receivedDate = String(formData.get("received_date") ?? "").trim();
  const recommendation = String(formData.get("recommendation") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();

  const { error } = await addThesisReview({
    thesis_id: thesisId,
    reviewer_id: reviewerId,
    received_date: receivedDate || null,
    recommendation: recommendation || null,
    comments: comments || null,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}

export async function addThesisCorrectionAction(
  thesisId: string,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(thesisId)) return { error: "Invalid thesis record." };

  const status = parseOptionalStatus(formData, "status");
  if (!status) return { error: "Please choose a status." };

  const submittedDate = String(formData.get("submitted_date") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  const { error } = await addThesisCorrection({
    thesis_id: thesisId,
    submitted_date: submittedDate || null,
    status,
    remarks: remarks || null,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  // addThesisCorrectionAction is only ever bound with thesisId (see
  // ThesisCorrectionForm), so student_id is resolved here rather than
  // threading a new prop through the component.
  const thesis = await getThesisRecordById(thesisId);
  if (thesis) {
    await syncStudentMilestoneByCode(thesis.student_id, ["THESIS_CORRECTIONS"], {
      status,
      ...(TERMINAL_GOOD.has(status) ? { completed_date: TODAY() } : {}),
    });
    await notifyStudent(
      thesis.student_id,
      "Thesis Correction Update",
      `Your thesis correction status has been updated to "${status.replace(/_/g, " ")}".`
    );
  }

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}

export async function upsertVivaExaminationAction(
  studentId: string,
  thesisId: string,
  existingId: string | null,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(studentId) || !UUID_RE.test(thesisId)) return { error: "Invalid request." };

  const scheduledDate = String(formData.get("scheduled_date") ?? "").trim();
  const actualDate = String(formData.get("actual_date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const result = String(formData.get("result") ?? "").trim();
  const comments = String(formData.get("examiner_comments") ?? "").trim();

  const { error } = await upsertVivaExamination(existingId, {
    student_id: studentId,
    thesis_id: thesisId,
    scheduled_date: scheduledDate || null,
    actual_date: actualDate || null,
    status: status || null,
    result: result || null,
    examiner_comments: comments || null,
  });
  if (error) return { error: "Could not save the viva examination." };

  // viva_examinations.status/result are unconstrained free text (no shared
  // vocabulary supplied — see table comment), so they cannot be assigned
  // directly to student_milestones.status (11-value CHECK constraint).
  // What's safe to infer: an actual_date being recorded means the viva
  // took place, which maps to the milestone being 'completed' — distinct
  // from the pass/fail outcome, which lives in result_declarations.
  if (actualDate) {
    await syncStudentMilestoneByCode(studentId, ["VIVA_VOCE", "DEFENCE_VIVA_VOCE"], {
      status: "completed",
      completed_date: actualDate,
    });
    await notifyStudent(studentId, "Viva/Defence Update", "Your viva/defence has been recorded as completed.");
  }

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}

export async function upsertResultDeclarationAction(
  studentId: string,
  thesisId: string,
  existingId: string | null,
  _prevState: ThesisFormState | undefined,
  formData: FormData
): Promise<ThesisFormState> {
  await requireRole("management");
  if (!UUID_RE.test(studentId)) return { error: "Invalid request." };

  const declarationDate = String(formData.get("declaration_date") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const examinerFeeStatus = String(formData.get("examiner_fee_status") ?? "").trim();
  const transcriptStatus = String(formData.get("transcript_status") ?? "").trim();
  const remarks = String(formData.get("remarks") ?? "").trim();

  const { error } = await upsertResultDeclaration(existingId, {
    student_id: studentId,
    declaration_date: declarationDate || null,
    status: status || null,
    clearance_uop: formData.get("clearance_uop") === "on",
    clearance_nceg: formData.get("clearance_nceg") === "on",
    library_submission: formData.get("library_submission") === "on",
    it_submission: formData.get("it_submission") === "on",
    secrecy_submission: formData.get("secrecy_submission") === "on",
    examiner_fee_status: examinerFeeStatus || null,
    transcript_status: transcriptStatus || null,
    remarks: remarks || null,
  });
  if (error) return { error: "Could not save the result declaration." };

  // result_declarations.status is likewise unconstrained free text — a
  // declaration_date being set is what safely maps to the
  // RESULT_DECLARATION milestone being 'completed' (the roadmap step is
  // "a result was formally declared", not the declared outcome itself).
  if (declarationDate) {
    await syncStudentMilestoneByCode(studentId, ["RESULT_DECLARATION"], {
      status: "completed",
      completed_date: declarationDate,
    });
    await notifyStudent(studentId, "Result Declared", "Your academic result has been declared.");
  }

  revalidatePath(`/management/thesis/${thesisId}`);
  return {};
}
