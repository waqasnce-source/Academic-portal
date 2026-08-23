"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import type { EffectiveMilestone } from "@/lib/academic/milestones";
import { updateStudentMilestoneAction, type MilestoneUpdateState } from "../actions";

export function MilestoneUpdateForm({ studentId, milestone }: { studentId: string; milestone: EffectiveMilestone }) {
  const boundAction = updateStudentMilestoneAction.bind(null, studentId, milestone.id);
  const [state, formAction, pending] = useActionState<MilestoneUpdateState | undefined, FormData>(boundAction, undefined);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`status-${milestone.id}`} className={labelClasses}>
          Status
        </label>
        <select id={`status-${milestone.id}`} name="status" defaultValue={milestone.status} className={fieldClasses}>
          {STUDENT_MILESTONE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`planned_date-${milestone.id}`} className={labelClasses}>
          Planned Date
        </label>
        <input
          id={`planned_date-${milestone.id}`}
          name="planned_date"
          type="date"
          defaultValue={milestone.record?.planned_date ?? ""}
          className={fieldClasses}
        />
      </div>
      <div className="flex flex-col gap-1">
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
      <div className="flex flex-col gap-1">
        <label htmlFor={`completed_date-${milestone.id}`} className={labelClasses}>
          Completed Date
        </label>
        <input
          id={`completed_date-${milestone.id}`}
          name="completed_date"
          type="date"
          defaultValue={milestone.record?.completed_date ?? ""}
          className={fieldClasses}
        />
      </div>
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-4">
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
      <div className="col-span-2 flex items-center gap-3 sm:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {state?.message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
        {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      </div>
    </form>
  );
}
