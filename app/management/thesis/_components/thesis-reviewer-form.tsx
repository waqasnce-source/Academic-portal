"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { THESIS_REVIEWER_TYPES } from "@/lib/academic/status-enums";
import { addThesisReviewerAction, type ThesisFormState } from "../actions";

export function ThesisReviewerForm({ thesisId }: { thesisId: string }) {
  const boundAction = addThesisReviewerAction.bind(null, thesisId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-100 p-3 dark:border-slate-900">
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="reviewer_name" className={labelClasses}>
          Name
        </label>
        <input id="reviewer_name" name="reviewer_name" type="text" required maxLength={200} className={fieldClasses} />
      </div>
      <div className="flex min-w-[120px] flex-col gap-1">
        <label htmlFor="reviewer_type" className={labelClasses}>
          Type
        </label>
        <select id="reviewer_type" name="reviewer_type" defaultValue="national" className={fieldClasses}>
          {THESIS_REVIEWER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t[0].toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="affiliation" className={labelClasses}>
          Affiliation
        </label>
        <input id="affiliation" name="affiliation" type="text" maxLength={300} className={fieldClasses} />
      </div>
      <div className="flex min-w-[120px] flex-col gap-1">
        <label htmlFor="country" className={labelClasses}>
          Country
        </label>
        <input id="country" name="country" type="text" maxLength={100} className={fieldClasses} />
      </div>
      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor="email" className={labelClasses}>
          Email
        </label>
        <input id="email" name="email" type="email" maxLength={255} className={fieldClasses} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Adding..." : "Add Reviewer"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
