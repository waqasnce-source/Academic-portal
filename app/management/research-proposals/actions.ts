"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  createResearchProject,
  updateResearchProject,
  createResearchProposalVersion,
  reviewResearchProposalStage,
  recordCorrectedProposalSubmission,
  recordProposalApproval,
  getResearchProjectForStudent,
  PROPOSAL_STAGE_STATUSES,
  type ProposalStageStatus,
} from "@/lib/academic/research";
import { syncStudentMilestoneByCode } from "@/lib/academic/milestone-sync";
import { notifyIfLinked } from "@/lib/management/notifications";
import { getStudentById } from "@/lib/management/students";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

export interface ResearchProposalFormState {
  error?: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  research_projects_student_id_fkey: "Selected student could not be found.",
  research_projects_supervisor_id_fkey: "Selected supervisor could not be found.",
  research_proposals_project_id_fkey: "Research project could not be found.",
  research_proposals_project_id_version_key: "This version already exists.",
};

export async function createResearchProjectAction(
  _prevState: ResearchProposalFormState | undefined,
  formData: FormData
): Promise<ResearchProposalFormState> {
  await requireRole("management");

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!UUID_RE.test(studentId)) return { error: "Please select a student." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  // research_projects has no DB-level uniqueness on student_id, but every
  // reader (getResearchProjectForStudent, the Student 360 view) expects at
  // most one project per student and uses .maybeSingle() accordingly —
  // checked here rather than adding a schema constraint for this alone.
  const existing = await getResearchProjectForStudent(studentId);
  if (existing) return { error: "This student already has a research project." };

  const abstract = String(formData.get("abstract") ?? "").trim();
  const researchArea = String(formData.get("research_area") ?? "").trim();
  const supervisorId = String(formData.get("supervisor_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const { error, data } = await createResearchProject({
    student_id: studentId,
    title,
    abstract: abstract || null,
    research_area: researchArea || null,
    supervisor_id: UUID_RE.test(supervisorId) ? supervisorId : null,
    status: status || null,
  });
  if (error || !data) return { error: toUserMessage(error!, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/research-proposals");
  redirect(`/management/research-proposals/${data.id}`);
}

export async function updateResearchProjectAction(
  projectId: string,
  studentId: string,
  _prevState: ResearchProposalFormState | undefined,
  formData: FormData
): Promise<ResearchProposalFormState> {
  await requireRole("management");
  if (!UUID_RE.test(projectId)) return { error: "Invalid research project." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };
  const abstract = String(formData.get("abstract") ?? "").trim();
  const researchArea = String(formData.get("research_area") ?? "").trim();
  const supervisorId = String(formData.get("supervisor_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  const { error } = await updateResearchProject(projectId, {
    student_id: studentId,
    title,
    abstract: abstract || null,
    research_area: researchArea || null,
    supervisor_id: UUID_RE.test(supervisorId) ? supervisorId : null,
    status: status || null,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/management/research-proposals/${projectId}`);
  return {};
}

export async function createProposalVersionAction(
  projectId: string,
  _prevState: ResearchProposalFormState | undefined,
  formData: FormData
): Promise<ResearchProposalFormState> {
  await requireRole("management");
  if (!UUID_RE.test(projectId)) return { error: "Invalid research project." };

  const remarks = String(formData.get("remarks") ?? "").trim();
  const { error } = await createResearchProposalVersion(projectId, remarks || null);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath(`/management/research-proposals/${projectId}`);
  return {};
}

function parseStageStatus(formData: FormData, field: string): ProposalStageStatus | null {
  const raw = String(formData.get(field) ?? "").trim();
  return (PROPOSAL_STAGE_STATUSES as readonly string[]).includes(raw) ? (raw as ProposalStageStatus) : null;
}

/**
 * Records a GSC or ASRB stage decision on one proposal version, and:
 *  - syncs the matching student_milestones row (GSC_PRESENTATION /
 *    ASRB_PRESENTATION — the same code across MS/MPhil and PhD templates)
 *    so getStudentAcademicStatus() reflects the decision immediately;
 *  - notifies the student if their account is linked.
 * A milestone-sync or notification failure is logged but never blocks the
 * review itself from being recorded.
 */
export async function reviewProposalStageAction(
  proposalId: string,
  studentId: string,
  projectId: string,
  stage: "gsc" | "asrb",
  _prevState: ResearchProposalFormState | undefined,
  formData: FormData
): Promise<ResearchProposalFormState> {
  const profile = await requireRole("management");
  if (!UUID_RE.test(proposalId) || !UUID_RE.test(studentId)) return { error: "Invalid request." };

  const status = parseStageStatus(formData, "status");
  if (!status) return { error: "Please choose a status." };

  const date = String(formData.get("date") ?? "").trim();
  const comments = String(formData.get("comments") ?? "").trim();

  const { error } = await reviewResearchProposalStage(proposalId, {
    stage,
    status,
    date: date || null,
    comments: comments || null,
    reviewedBy: profile.id,
  });
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  const milestoneCode = stage === "gsc" ? "GSC_PRESENTATION" : "ASRB_PRESENTATION";
  const isDone = status === "completed" || status === "approved";
  await syncStudentMilestoneByCode(studentId, [milestoneCode], {
    status,
    ...(isDone ? { completed_date: new Date().toISOString().slice(0, 10) } : {}),
  });

  const student = await getStudentById(studentId);
  const stageLabel = stage === "gsc" ? "GSC" : "ASRB";
  await notifyIfLinked(
    student?.profile_id ?? null,
    `${stageLabel} Review Update`,
    `Your ${stageLabel} presentation status has been updated to "${status.replace(/_/g, " ")}".`
  );

  revalidatePath(`/management/research-proposals/${projectId}`);
  return {};
}

/**
 * Records the corrected-proposal resubmission date and/or final approval
 * date on one proposal version. Each, when set, syncs the
 * CORRECTED_PROPOSAL_SUBMISSION milestone (same code across MS/MPhil and
 * PhD templates) — resubmission maps to 'submitted', approval maps to
 * 'approved' (a terminal-good status, closing out the research-proposal
 * phase of the roadmap).
 */
export async function updateProposalDatesAction(
  proposalId: string,
  studentId: string,
  projectId: string,
  _prevState: ResearchProposalFormState | undefined,
  formData: FormData
): Promise<ResearchProposalFormState> {
  await requireRole("management");
  if (!UUID_RE.test(proposalId) || !UUID_RE.test(studentId)) return { error: "Invalid request." };

  const correctedDate = String(formData.get("corrected_submission_date") ?? "").trim();
  const approvalDate = String(formData.get("approval_date") ?? "").trim();

  if (correctedDate) {
    const { error } = await recordCorrectedProposalSubmission(proposalId, correctedDate);
    if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };
    await syncStudentMilestoneByCode(studentId, ["CORRECTED_PROPOSAL_SUBMISSION"], { status: "submitted" });
  }

  if (approvalDate) {
    const { error } = await recordProposalApproval(proposalId, approvalDate);
    if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };
    await syncStudentMilestoneByCode(studentId, ["CORRECTED_PROPOSAL_SUBMISSION"], {
      status: "approved",
      completed_date: approvalDate,
    });

    const student = await getStudentById(studentId);
    await notifyIfLinked(
      student?.profile_id ?? null,
      "Research Proposal Approved",
      "Your corrected research proposal has been approved."
    );
  }

  revalidatePath(`/management/research-proposals/${projectId}`);
  return {};
}
