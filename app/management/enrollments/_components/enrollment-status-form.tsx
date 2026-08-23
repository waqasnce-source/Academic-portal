"use client";

import { useActionState, useRef } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { ENROLLMENT_STATUSES } from "@/lib/management/status-enums";
import { updateEnrollmentStatusAction, type EnrollmentFormState } from "../actions";

const STATUS_LABELS: Record<(typeof ENROLLMENT_STATUSES)[number], string> = {
  active: "Active",
  completed: "Completed",
  dropped: "Dropped",
  failed: "Failed",
};

export function EnrollmentStatusForm({ enrollmentId, currentStatus }: { enrollmentId: string; currentStatus: string }) {
  const boundAction = updateEnrollmentStatusAction.bind(null, enrollmentId);
  const [state, formAction, pending] = useActionState<EnrollmentFormState | undefined, FormData>(
    boundAction,
    undefined
  );
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const nextStatus = selectRef.current?.value;
        if (nextStatus && nextStatus !== currentStatus) {
          const label = STATUS_LABELS[nextStatus as keyof typeof STATUS_LABELS] ?? nextStatus;
          if (!confirm(`Change this enrollment's status to "${label}"? This affects the student's academic record.`)) {
            e.preventDefault();
          }
        }
      }}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" ref={selectRef} defaultValue={currentStatus} className={fieldClasses}>
          {ENROLLMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The enrollment record is never deleted — changing status (e.g. to &lsquo;Dropped&rsquo;) preserves the
          historical record rather than removing it.
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Saving..." : "Update Status"}
      </button>
    </form>
  );
}
