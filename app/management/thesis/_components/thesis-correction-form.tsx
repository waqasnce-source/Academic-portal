"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import { addThesisCorrectionAction, type ThesisFormState } from "../actions";

export function ThesisCorrectionForm({ thesisId }: { thesisId: string }) {
  const boundAction = addThesisCorrectionAction.bind(null, thesisId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-100 p-3 dark:border-slate-900">
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="submitted_date" className={labelClasses}>
          Submitted Date
        </label>
        <input id="submitted_date" name="submitted_date" type="date" className={fieldClasses} />
      </div>
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="correction_status" className={labelClasses}>
          Status
        </label>
        <select id="correction_status" name="status" defaultValue="submitted" className={fieldClasses}>
          {STUDENT_MILESTONE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="correction_remarks" className={labelClasses}>
          Remarks
        </label>
        <input id="correction_remarks" name="remarks" type="text" maxLength={2000} className={fieldClasses} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Saving..." : "Record Correction"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
