"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { updateProposalDatesAction, type ResearchProposalFormState } from "../actions";

export function ProposalDatesForm({
  proposalId,
  studentId,
  projectId,
  defaultValues,
}: {
  proposalId: string;
  studentId: string;
  projectId: string;
  defaultValues: { corrected_submission_date: string | null; approval_date: string | null };
}) {
  const boundAction = updateProposalDatesAction.bind(null, proposalId, studentId, projectId);
  const [state, formAction, pending] = useActionState<ResearchProposalFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className={labelClasses}>Corrected Proposal &amp; DAS Approval</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="corrected_submission_date" className={labelClasses}>
            Corrected Proposal Submitted
          </label>
          <input
            id="corrected_submission_date"
            name="corrected_submission_date"
            type="date"
            defaultValue={defaultValues.corrected_submission_date ?? ""}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="approval_date" className={labelClasses}>
            Approved
          </label>
          <input
            id="approval_date"
            name="approval_date"
            type="date"
            defaultValue={defaultValues.approval_date ?? ""}
            className={fieldClasses}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Setting either date syncs the Corrected Research Proposal Submission milestone on the student&apos;s roadmap.
      </p>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
