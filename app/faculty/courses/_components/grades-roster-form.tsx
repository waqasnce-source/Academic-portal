"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { StatusBadge } from "@/app/management/_components/status-badge";
import type { OfferingRosterRow } from "@/lib/academic/faculty-courses";
import { saveGradesAction, publishResultAction, type FacultyCourseFormState } from "../actions";

const GRADES_FORM_ID = "faculty-grades-batch-form";

export function GradesRosterForm({ offeringId, roster }: { offeringId: string; roster: OfferingRosterRow[] }) {
  const boundAction = saveGradesAction.bind(null, offeringId);
  const [state, formAction, pending] = useActionState<FacultyCourseFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  if (roster.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No students enrolled in this offering yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Inputs below reference this form by id (HTML5 `form=` attribute) rather than nesting —
          each row also needs its own independent Publish <form>, and forms cannot nest. */}
      <form id={GRADES_FORM_ID} action={formAction} />

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Marks</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Grade</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Grade Point</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Remarks</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Publication</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {roster.map((r) => (
              <tr key={r.enrollmentId}>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{r.student.name}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{r.student.studentNumber}</div>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <input
                    form={GRADES_FORM_ID}
                    name={`marks_${r.enrollmentId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={r.result?.marks ?? ""}
                    className={fieldClasses + " w-24"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <input
                    form={GRADES_FORM_ID}
                    name={`grade_${r.enrollmentId}`}
                    type="text"
                    maxLength={20}
                    defaultValue={r.result?.grade ?? ""}
                    className={fieldClasses + " w-20"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <input
                    form={GRADES_FORM_ID}
                    name={`grade_point_${r.enrollmentId}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={r.result?.grade_point ?? ""}
                    className={fieldClasses + " w-24"}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <input
                    form={GRADES_FORM_ID}
                    name={`remarks_${r.enrollmentId}`}
                    type="text"
                    maxLength={500}
                    defaultValue={r.result?.remarks ?? ""}
                    className={fieldClasses + " w-full"}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {r.result?.published_at ? (
                    <StatusBadge label="Published" tone="success" />
                  ) : r.result ? (
                    <form action={publishResultAction.bind(null, offeringId, r.result.id, r.student.id)}>
                      <button
                        type="submit"
                        className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        Publish
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">Not graded yet</span>
                  )}
                  {r.result?.published_at && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Editing marks/grade above and saving will change a published result.
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        form={GRADES_FORM_ID}
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save Grades"}
      </button>
      <p className={labelClasses}>
        Saving never publishes a grade — publication is a separate, explicit action per student. No institutional
        grading scale is configured yet, so grade/grade point must be entered directly.
      </p>
    </div>
  );
}
