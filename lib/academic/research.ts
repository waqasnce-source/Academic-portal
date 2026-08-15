import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Shared progress vocabulary — see docs/database-design.md §15.6. */
export const PROPOSAL_STAGE_STATUSES = [
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
export type ProposalStageStatus = (typeof PROPOSAL_STAGE_STATUSES)[number];

export interface ResearchProjectRow {
  id: string;
  title: string;
  abstract: string | null;
  research_area: string | null;
  status: string | null;
  supervisor: { id: string; name: string } | null;
}

/**
 * research_projects.status has no supplied vocabulary (see migration
 * comment) — returned as-is, unconstrained.
 */
export async function getResearchProjectForStudent(studentId: string): Promise<ResearchProjectRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_projects")
    .select("id, title, abstract, research_area, status, supervisor:faculty ( id, name )")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.error("getResearchProjectForStudent failed:", error);
    return null;
  }
  return data as unknown as ResearchProjectRow | null;
}

export interface ResearchProposalRow {
  id: string;
  version: number;
  gsc_status: ProposalStageStatus | null;
  gsc_date: string | null;
  gsc_comments: string | null;
  gsc_reviewed_by: string | null;
  asrb_status: ProposalStageStatus | null;
  asrb_date: string | null;
  asrb_comments: string | null;
  asrb_reviewed_by: string | null;
  corrected_submission_date: string | null;
  approval_date: string | null;
  remarks: string | null;
}

const RESEARCH_PROPOSAL_SELECT = `
  id,
  version,
  gsc_status,
  gsc_date,
  gsc_comments,
  gsc_reviewed_by,
  asrb_status,
  asrb_date,
  asrb_comments,
  asrb_reviewed_by,
  corrected_submission_date,
  approval_date,
  remarks
`;

/** Full version history for a project, newest version first — never overwritten, see table comment. */
export async function getResearchProposalsForProject(projectId: string): Promise<ResearchProposalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("research_proposals")
    .select(RESEARCH_PROPOSAL_SELECT)
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  if (error) {
    console.error("getResearchProposalsForProject failed:", error);
    return [];
  }
  return (data ?? []) as ResearchProposalRow[];
}

/** The latest (highest-version) proposal for a project, or null if none exist yet. */
export async function getLatestResearchProposal(projectId: string): Promise<ResearchProposalRow | null> {
  const proposals = await getResearchProposalsForProject(projectId);
  return proposals[0] ?? null;
}

// ---- Writes — management-only, enforced by research_projects_*_management / research_proposals_*_management RLS ----

export interface ResearchProjectInput {
  student_id: string;
  title: string;
  abstract: string | null;
  research_area: string | null;
  supervisor_id: string | null;
  status: string | null;
}

export async function createResearchProject(input: ResearchProjectInput) {
  const supabase = await createClient();
  return supabase.from("research_projects").insert(input).select("id").single();
}

export async function updateResearchProject(id: string, input: ResearchProjectInput) {
  const supabase = await createClient();
  return supabase.from("research_projects").update(input).eq("id", id).select("id").single();
}

/**
 * Creates the next version for a project — version is computed server-side
 * from the current max rather than trusted from the caller, mirroring the
 * document_submissions versioning convention. A corrected proposal is
 * always a new row (see table comment: history is never overwritten).
 */
export async function createResearchProposalVersion(projectId: string, remarks: string | null) {
  const supabase = await createClient();
  const { data: latest, error: latestError } = await supabase
    .from("research_proposals")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) return { data: null, error: latestError };

  const nextVersion = (latest?.version ?? 0) + 1;
  return supabase
    .from("research_proposals")
    .insert({ project_id: projectId, version: nextVersion, remarks })
    .select("id")
    .single();
}

export interface ProposalStageReviewInput {
  stage: "gsc" | "asrb";
  status: ProposalStageStatus;
  date: string | null;
  comments: string | null;
  reviewedBy: string;
}

/** Updates only the gsc_* or asrb_* column group for one proposal version, stamping who made the call. */
export async function reviewResearchProposalStage(proposalId: string, input: ProposalStageReviewInput) {
  const supabase = await createClient();
  const patch =
    input.stage === "gsc"
      ? {
          gsc_status: input.status,
          gsc_date: input.date,
          gsc_comments: input.comments,
          gsc_reviewed_by: input.reviewedBy,
        }
      : {
          asrb_status: input.status,
          asrb_date: input.date,
          asrb_comments: input.comments,
          asrb_reviewed_by: input.reviewedBy,
        };
  return supabase.from("research_proposals").update(patch).eq("id", proposalId);
}

/** Records the corrected-proposal resubmission date (CORRECTED_PROPOSAL_SUBMISSION milestone). */
export async function recordCorrectedProposalSubmission(proposalId: string, date: string | null) {
  const supabase = await createClient();
  return supabase.from("research_proposals").update({ corrected_submission_date: date }).eq("id", proposalId);
}

/** Records final proposal approval (DAS sign-off after ASRB corrections are cleared). */
export async function recordProposalApproval(proposalId: string, date: string | null) {
  const supabase = await createClient();
  return supabase.from("research_proposals").update({ approval_date: date }).eq("id", proposalId);
}
