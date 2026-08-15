"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { COURSE_OFFERING_FACULTY_ROLES } from "@/lib/management/status-enums";
import type { CourseOfferingFacultyRow } from "@/lib/management/course-offerings";
import { assignFacultyAction, removeFacultyAssignmentAction, type CourseOfferingFormState } from "../actions";

const ROLE_LABELS: Record<(typeof COURSE_OFFERING_FACULTY_ROLES)[number], string> = {
  primary: "Primary",
  co_instructor: "Co-Instructor",
  lab_instructor: "Lab Instructor",
};

export function FacultyAssignmentPanel({
  offeringId,
  assignments,
  facultyOptions,
}: {
  offeringId: string;
  assignments: CourseOfferingFacultyRow[];
  facultyOptions: { id: string; name: string }[];
}) {
  const boundAction = assignFacultyAction.bind(null, offeringId);
  const [state, formAction, pending] = useActionState<CourseOfferingFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <div className="space-y-4">
      {assignments.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No faculty assigned yet — this offering is TBA.
        </p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                {a.faculty.profile?.full_name ?? a.faculty.name}
                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">{ROLE_LABELS[a.role]}</span>
              </span>
              <form action={removeFacultyAssignmentAction.bind(null, offeringId, a.id)}>
                <button
                  type="submit"
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-md border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <div className="flex min-w-[200px] flex-col gap-1">
          <label htmlFor="faculty_id" className={labelClasses}>
            Faculty
          </label>
          <select id="faculty_id" name="faculty_id" defaultValue="" required className={fieldClasses}>
            <option value="" disabled>
              Select a faculty member
            </option>
            {facultyOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[160px] flex-col gap-1">
          <label htmlFor="role" className={labelClasses}>
            Role
          </label>
          <select id="role" name="role" defaultValue="primary" className={fieldClasses}>
            {COURSE_OFFERING_FACULTY_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Assigning..." : "Assign"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </div>
  );
}
