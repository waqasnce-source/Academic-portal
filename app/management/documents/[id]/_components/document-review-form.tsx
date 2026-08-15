"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { reviewDocumentSubmissionAction, type DocumentReviewFormState } from "../actions";

export function DocumentReviewForm({ submissionId }: { submissionId: string }) {
  const boundAction = reviewDocumentSubmissionAction.bind(null, submissionId);
  const [state, formAction, pending] = useActionState<DocumentReviewFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-1">
        <label htmlFor="outcome" className={labelClasses}>
          Decision
        </label>
        <select id="outcome" name="outcome" defaultValue="approved" className={fieldClasses}>
          <option value="approved">Accept</option>
          <option value="corrections_required">Request Correction</option>
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="remarks" className={labelClasses}>
          Comments
        </label>
        <textarea id="remarks" name="remarks" rows={3} maxLength={2000} className={fieldClasses} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save Review"}
      </button>
    </form>
  );
}
