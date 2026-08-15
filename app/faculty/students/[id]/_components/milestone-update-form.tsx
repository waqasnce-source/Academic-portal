"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import type { EffectiveMilestone } from "@/lib/academic/milestones";
import { updateStudentMilestoneAction, type FacultyMilestoneUpdateState } from "../actions";

export function MilestoneUpdateForm({
  studentId,
  milestone,
}: {
  studentId: string;
  milestone: EffectiveMilestone;
}) {
  const boundAction = updateStudentMilestoneAction.bind(null, studentId, milestone.id);
  const [state, formAction, pending] = useActionState<FacultyMilestoneUpdateState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor={`status-${milestone.id}`} className={labelClasses}>
          Status
        </label>
        <select
          id={`status-${milestone.id}`}
          name="status"
          defaultValue={milestone.status}
          className={fieldClasses}
        >
          {STUDENT_MILESTONE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor={`due_date-${milestone.id}`} className={labelClasses}>
          Due Date
        </label>
        <input
          id={`due_date-${milestone.id}`}
          name="due_date"
          type="date"
          defaultValue={milestone.record?.due_date ?? ""}
          className={fieldClasses}
        />
      </div>

      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor={`remarks-${milestone.id}`} className={labelClasses}>
          Remarks
        </label>
        <input
          id={`remarks-${milestone.id}`}
          name="remarks"
          type="text"
          defaultValue={milestone.record?.remarks ?? ""}
          maxLength={2000}
          className={fieldClasses}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save"}
      </button>

      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
