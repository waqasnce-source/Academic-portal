"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { SUPERVISOR_ASSIGNMENT_ROLES } from "@/lib/management/status-enums";
import type { StudentOption, FacultyOption } from "@/lib/management/supervisor-assignments";
import type { SupervisorAssignmentFormState } from "../actions";

const ROLE_LABELS: Record<string, string> = { supervisor: "Supervisor", co_supervisor: "Co-Supervisor" };

export function SupervisorAssignmentForm({
  action,
  students,
  faculty,
}: {
  action: (
    prevState: SupervisorAssignmentFormState | undefined,
    formData: FormData
  ) => Promise<SupervisorAssignmentFormState>;
  students: StudentOption[];
  faculty: FacultyOption[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="student_id" className={labelClasses}>
          Student
        </label>
        <select id="student_id" name="student_id" defaultValue="" required className={fieldClasses}>
          <option value="" disabled>
            Select a student
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name} ({s.student_number})
            </option>
          ))}
        </select>
        {students.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">No active students exist yet.</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="faculty_id" className={labelClasses}>
          Faculty
        </label>
        <select id="faculty_id" name="faculty_id" defaultValue="" required className={fieldClasses}>
          <option value="" disabled>
            Select a faculty member
          </option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.designation})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="role" className={labelClasses}>
          Role
        </label>
        <select id="role" name="role" defaultValue="supervisor" className={fieldClasses}>
          {SUPERVISOR_ASSIGNMENT_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="start_date" className={labelClasses}>
          Start Date (optional)
        </label>
        <input id="start_date" name="start_date" type="date" className={fieldClasses} />
      </div>

      <div className="space-y-1">
        <label htmlFor="remarks" className={labelClasses}>
          Remarks (optional)
        </label>
        <textarea id="remarks" name="remarks" rows={3} maxLength={2000} className={fieldClasses} />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : "Assign"}
        </button>
        <Link
          href="/management/supervisor-assignments"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
