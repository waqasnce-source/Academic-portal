"use client";

import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { ATTENDANCE_STATUSES } from "@/lib/management/status-enums";
import type { SessionRosterRow } from "@/lib/academic/faculty-courses";
import { recordAttendanceAction, type FacultyCourseFormState } from "../actions";

const STATUS_LABELS: Record<(typeof ATTENDANCE_STATUSES)[number], string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export function AttendanceRosterForm({
  offeringId,
  sessionId,
  roster,
}: {
  offeringId: string;
  sessionId: string;
  roster: SessionRosterRow[];
}) {
  const boundAction = recordAttendanceAction.bind(null, offeringId, sessionId);
  const [state, formAction, pending] = useActionState<FacultyCourseFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  if (roster.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">No actively enrolled students for this offering yet.</p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              <th className="px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Remarks</th>
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
                  <select
                    name={`status_${r.enrollmentId}`}
                    defaultValue={r.currentStatus ?? "present"}
                    className={fieldClasses}
                  >
                    {ATTENDANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <input
                    name={`remarks_${r.enrollmentId}`}
                    type="text"
                    defaultValue={r.remarks ?? ""}
                    maxLength={500}
                    className={fieldClasses + " w-full"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Save Attendance"}
      </button>
      <p className={labelClasses}>Every row defaults to &lsquo;Present&rsquo; and is saved in one submission.</p>
    </form>
  );
}
