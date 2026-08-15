"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { createCourseSessionAction, type FacultyCourseFormState } from "../actions";

export function SessionCreateForm({ offeringId }: { offeringId: string }) {
  const boundAction = createCourseSessionAction.bind(null, offeringId);
  const [state, formAction, pending] = useActionState<FacultyCourseFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-md border border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="class_date" className={labelClasses}>
          Date
        </label>
        <input id="class_date" name="class_date" type="date" required className={fieldClasses} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="start_time" className={labelClasses}>
          Start
        </label>
        <input id="start_time" name="start_time" type="time" required className={fieldClasses} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="end_time" className={labelClasses}>
          End
        </label>
        <input id="end_time" name="end_time" type="time" required className={fieldClasses} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="session_type" className={labelClasses}>
          Session Type
        </label>
        <input
          id="session_type"
          name="session_type"
          type="text"
          placeholder="e.g. Lecture"
          required
          maxLength={100}
          className={fieldClasses}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="room" className={labelClasses}>
          Room
        </label>
        <input id="room" name="room" type="text" maxLength={100} className={fieldClasses} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Creating..." : "Add Session"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
