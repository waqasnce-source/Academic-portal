"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
// PROPOSAL_STAGE_STATUSES (lib/academic/research.ts) is the shared 11-value
// vocabulary, defined verbatim as STUDENT_MILESTONE_STATUSES — imported
// from status-enums.ts (no "server-only") so this Client Component doesn't
// pull a server-only module into the browser bundle.
import { STUDENT_MILESTONE_STATUSES as PROPOSAL_STAGE_STATUSES } from "@/lib/academic/status-enums";
import { reviewProposalStageAction, type ResearchProposalFormState } from "../actions";

export function ProposalStageReviewForm({
  proposalId,
  studentId,
  projectId,
  stage,
  currentStatus,
}: {
  proposalId: string;
  studentId: string;
  projectId: string;
  stage: "gsc" | "asrb";
  currentStatus: string | null;
}) {
  const boundAction = reviewProposalStageAction.bind(null, proposalId, studentId, projectId, stage);
  const [state, formAction, pending] = useActionState<ResearchProposalFormState | undefined, FormData>(
    boundAction,
    undefined
  );
  const stageLabel = stage === "gsc" ? "GSC" : "ASRB";

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className={labelClasses}>{stageLabel} Review</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${stage}-status`} className={labelClasses}>
            Status
          </label>
          <select id={`${stage}-status`} name="status" defaultValue={currentStatus ?? ""} required className={fieldClasses}>
            <option value="" disabled>
              Select status
            </option>
            {PROPOSAL_STAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={`${stage}-date`} className={labelClasses}>
            Date
          </label>
          <input id={`${stage}-date`} name="date" type="date" className={fieldClasses} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${stage}-comments`} className={labelClasses}>
          Comments
        </label>
        <textarea id={`${stage}-comments`} name="comments" rows={2} maxLength={2000} className={fieldClasses} />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : `Record ${stageLabel} Decision`}
      </button>
    </form>
  );
}
