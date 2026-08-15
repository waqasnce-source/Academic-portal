"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { upsertVivaExaminationAction, type ThesisFormState } from "../actions";

export function VivaForm({
  studentId,
  thesisId,
  existingId,
  defaultValues,
}: {
  studentId: string;
  thesisId: string;
  existingId: string | null;
  defaultValues?: {
    scheduled_date: string | null;
    actual_date: string | null;
    status: string | null;
    result: string | null;
    examiner_comments: string | null;
  };
}) {
  const boundAction = upsertVivaExaminationAction.bind(null, studentId, thesisId, existingId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="scheduled_date" className={labelClasses}>
            Scheduled Date
          </label>
          <input id="scheduled_date" name="scheduled_date" type="date" defaultValue={defaultValues?.scheduled_date ?? ""} className={fieldClasses} />
        </div>
        <div className="space-y-1">
          <label htmlFor="actual_date" className={labelClasses}>
            Actual Date
          </label>
          <input id="actual_date" name="actual_date" type="date" defaultValue={defaultValues?.actual_date ?? ""} className={fieldClasses} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="viva_status" className={labelClasses}>
            Status
          </label>
          <input id="viva_status" name="status" type="text" defaultValue={defaultValues?.status ?? ""} maxLength={100} className={fieldClasses} placeholder="e.g. scheduled" />
        </div>
        <div className="space-y-1">
          <label htmlFor="viva_result" className={labelClasses}>
            Result
          </label>
          <input id="viva_result" name="result" type="text" defaultValue={defaultValues?.result ?? ""} maxLength={100} className={fieldClasses} placeholder="e.g. pass" />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="examiner_comments" className={labelClasses}>
          Examiner Comments
        </label>
        <textarea
          id="examiner_comments"
          name="examiner_comments"
          rows={2}
          defaultValue={defaultValues?.examiner_comments ?? ""}
          maxLength={2000}
          className={fieldClasses}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
