"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { OFFERING_STATUSES } from "@/lib/management/status-enums";
import type { CourseOfferingFormState } from "../actions";

const STATUS_LABELS: Record<(typeof OFFERING_STATUSES)[number], string> = {
  planned: "Planned",
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
};

export interface CourseOfferingFormOptions {
  courses: { id: string; code: string; name: string }[];
  semesters: { id: string; name: string; academic_year: string }[];
}

export function CourseOfferingForm({
  action,
  options,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: CourseOfferingFormState | undefined,
    formData: FormData
  ) => Promise<CourseOfferingFormState>;
  options: CourseOfferingFormOptions;
  defaultValues?: {
    course_id: string;
    semester_id: string;
    section: string;
    capacity: number | null;
    status: string;
  };
  /** Editing an existing offering still allows changing course/semester/section — the unique (course_id, semester_id, section) constraint is the actual guard against a resulting duplicate. */
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="space-y-1">
        <label htmlFor="course_id" className={labelClasses}>
          Course
        </label>
        <select
          id="course_id"
          name="course_id"
          defaultValue={defaultValues?.course_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a course
          </option>
          {options.courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        {options.courses.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No active courses exist yet.</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="semester_id" className={labelClasses}>
          Semester
        </label>
        <select
          id="semester_id"
          name="semester_id"
          defaultValue={defaultValues?.semester_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a semester
          </option>
          {options.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academic_year} — {s.name}
            </option>
          ))}
        </select>
        {options.semesters.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No semesters exist yet — create one under Semester Management first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="section" className={labelClasses}>
            Section
          </label>
          <input
            id="section"
            name="section"
            type="text"
            defaultValue={defaultValues?.section ?? "A"}
            maxLength={20}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="capacity" className={labelClasses}>
            Capacity
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue={defaultValues?.capacity ?? ""}
            placeholder="Unlimited"
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={defaultValues?.status ?? "planned"} className={fieldClasses}>
          {OFFERING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Only &lsquo;Planned&rsquo;/&lsquo;Open&rsquo; offerings are offered for new enrollment; &lsquo;Cancelled&rsquo;
          offerings are excluded from the enrollment form entirely.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href="/management/course-offerings"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
