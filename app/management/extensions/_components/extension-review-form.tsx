"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { EXTENSION_APPLICATION_STATUSES, type ExtensionApplicationStatus } from "@/lib/management/status-enums";
import { reviewExtensionApplicationAction, type ExtensionFormState } from "../actions";

const STATUS_LABELS: Record<ExtensionApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
};

export function ExtensionReviewForm({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: ExtensionApplicationStatus;
}) {
  const boundAction = reviewExtensionApplicationAction.bind(null, applicationId);
  const [state, formAction, pending] = useActionState<ExtensionFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  const isFinal = currentStatus === "approved" || currentStatus === "rejected";

  if (isFinal) {
    return (
      <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        This application has a final decision ({STATUS_LABELS[currentStatus]}) and cannot be changed. Record a new
        application if the student needs another review.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={currentStatus} className={fieldClasses}>
          {EXTENSION_APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="recommendation" className={labelClasses}>
          Recommendation
        </label>
        <textarea id="recommendation" name="recommendation" rows={2} maxLength={2000} className={fieldClasses} />
      </div>

      <div className="space-y-1">
        <label htmlFor="remarks" className={labelClasses}>
          Remarks
        </label>
        <textarea id="remarks" name="remarks" rows={2} maxLength={2000} className={fieldClasses} />
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
