"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import { updateThesisRecordAction, type ThesisFormState } from "../actions";

export function ThesisEditForm({
  thesisId,
  studentId,
  defaultValues,
}: {
  thesisId: string;
  studentId: string;
  defaultValues: {
    thesis_title: string | null;
    submission_date: string | null;
    status: string | null;
    clearance_status: string | null;
    remarks: string | null;
  };
}) {
  const boundAction = updateThesisRecordAction.bind(null, thesisId, studentId);
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="space-y-1">
        <label htmlFor="thesis_title" className={labelClasses}>
          Thesis Title
        </label>
        <input
          id="thesis_title"
          name="thesis_title"
          type="text"
          defaultValue={defaultValues.thesis_title ?? ""}
          maxLength={500}
          className={fieldClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="submission_date" className={labelClasses}>
            Submission Date
          </label>
          <input
            id="submission_date"
            name="submission_date"
            type="date"
            defaultValue={defaultValues.submission_date ?? ""}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className={labelClasses}>
            Status
          </label>
          <select id="status" name="status" defaultValue={defaultValues.status ?? ""} className={fieldClasses}>
            <option value="">—</option>
            {STUDENT_MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="clearance_status" className={labelClasses}>
          Clearance Status
        </label>
        <input
          id="clearance_status"
          name="clearance_status"
          type="text"
          defaultValue={defaultValues.clearance_status ?? ""}
          maxLength={200}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="remarks" className={labelClasses}>
          Remarks
        </label>
        <textarea id="remarks" name="remarks" rows={2} defaultValue={defaultValues.remarks ?? ""} maxLength={2000} className={fieldClasses} />
      </div>

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
