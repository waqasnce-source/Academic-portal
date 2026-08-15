"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { StudentOption } from "@/lib/management/extensions";
import type { SupervisorOption } from "@/lib/management/research-proposals";
import { createResearchProjectAction, type ResearchProposalFormState } from "../actions";

export function ResearchProjectCreateForm({
  students,
  faculty,
}: {
  students: StudentOption[];
  faculty: SupervisorOption[];
}) {
  const [state, formAction, pending] = useActionState<ResearchProposalFormState | undefined, FormData>(
    createResearchProjectAction,
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
        <label htmlFor="title" className={labelClasses}>
          Project / Proposal Title
        </label>
        <input id="title" name="title" type="text" required maxLength={500} className={fieldClasses} />
      </div>

      <div className="space-y-1">
        <label htmlFor="research_area" className={labelClasses}>
          Research Area
        </label>
        <input id="research_area" name="research_area" type="text" maxLength={200} className={fieldClasses} />
      </div>

      <div className="space-y-1">
        <label htmlFor="supervisor_id" className={labelClasses}>
          Supervisor
        </label>
        <select id="supervisor_id" name="supervisor_id" defaultValue="" className={fieldClasses}>
          <option value="">—</option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Descriptive only — access control follows the student&apos;s active Supervisor Assignment, not this field.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="abstract" className={labelClasses}>
          Abstract
        </label>
        <textarea id="abstract" name="abstract" rows={4} maxLength={4000} className={fieldClasses} />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Saving..." : "Create Project"}
        </button>
        <Link
          href="/management/research-proposals"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
