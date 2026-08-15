"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import type { StudentOption } from "@/lib/management/extensions";
import { createThesisRecordAction, type ThesisFormState } from "../actions";

export function ThesisCreateForm({ students }: { students: StudentOption[] }) {
  const [state, formAction, pending] = useActionState<ThesisFormState | undefined, FormData>(
    createThesisRecordAction,
    undefined
  );

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">No active students exist yet.</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="thesis_title" className={labelClasses}>
          Thesis Title (optional)
        </label>
        <input id="thesis_title" name="thesis_title" type="text" maxLength={500} className={fieldClasses} />
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status (optional)
        </label>
        <select id="status" name="status" defaultValue="" className={fieldClasses}>
          <option value="">—</option>
          {STUDENT_MILESTONE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Saving..." : "Create"}
        </button>
        <Link href="/management/thesis" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
