"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { createProposalVersionAction, type ResearchProposalFormState } from "../actions";

export function NewProposalVersionForm({ projectId, nextVersion }: { projectId: string; nextVersion: number }) {
  const boundAction = createProposalVersionAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState<ResearchProposalFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <p className={labelClasses}>Start Version {nextVersion}</p>
      <div className="space-y-1">
        <label htmlFor="new-version-remarks" className={labelClasses}>
          Remarks
        </label>
        <textarea id="new-version-remarks" name="remarks" rows={2} maxLength={2000} className={fieldClasses} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Proposal history is never overwritten — this creates a new versioned row for a corrected or resubmitted
        proposal rather than editing the version above.
      </p>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        {pending ? "Creating..." : "Create New Version"}
      </button>
    </form>
  );
}
