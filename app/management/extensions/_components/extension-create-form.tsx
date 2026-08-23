"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { StudentOption } from "@/lib/management/extensions";
import { createExtensionApplicationAction, type ExtensionFormState } from "../actions";

export function ExtensionCreateForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ExtensionFormState | undefined, FormData>(
    createExtensionApplicationAction,
    undefined
  );

  const today = new Date().toISOString().slice(0, 10);

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
        <label htmlFor="application_date" className={labelClasses}>
          Application Date
        </label>
        <input id="application_date" name="application_date" type="date" defaultValue={today} required className={fieldClasses} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="current_semester" className={labelClasses}>
            Current Semester
          </label>
          <input id="current_semester" name="current_semester" type="number" min="1" className={fieldClasses} />
        </div>
        <div className="space-y-1">
          <label htmlFor="requested_extension_semesters" className={labelClasses}>
            Requested Semesters
          </label>
          <input id="requested_extension_semesters" name="requested_extension_semesters" type="number" min="1" className={fieldClasses} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="requested_from" className={labelClasses}>
            Requested From
          </label>
          <input id="requested_from" name="requested_from" type="date" className={fieldClasses} />
        </div>
        <div className="space-y-1">
          <label htmlFor="requested_to" className={labelClasses}>
            Requested To
          </label>
          <input id="requested_to" name="requested_to" type="date" className={fieldClasses} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="reason" className={labelClasses}>
          Reason
        </label>
        <textarea id="reason" name="reason" rows={3} maxLength={2000} className={fieldClasses} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : "Record Application"}
        </button>
        <Link
          href="/management/extensions"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
