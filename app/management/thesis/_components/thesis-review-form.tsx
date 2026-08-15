"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { addThesisReviewAction, type ThesisFormState } from "../actions";

export function ThesisReviewForm({ thesisId, reviewerId }: { thesisId: string; reviewerId: string }) {
  const boundAction = addThesisReviewAction.bind(null, thesisId, reviewerId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-900">
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor={`received_date-${reviewerId}`} className={labelClasses}>
          Received Date
        </label>
        <input id={`received_date-${reviewerId}`} name="received_date" type="date" className={fieldClasses} />
      </div>
      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor={`recommendation-${reviewerId}`} className={labelClasses}>
          Recommendation
        </label>
        <input id={`recommendation-${reviewerId}`} name="recommendation" type="text" maxLength={500} className={fieldClasses} />
      </div>
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor={`comments-${reviewerId}`} className={labelClasses}>
          Comments
        </label>
        <input id={`comments-${reviewerId}`} name="comments" type="text" maxLength={2000} className={fieldClasses} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Record Review"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
