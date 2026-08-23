"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { StudentOption } from "@/lib/management/extensions";
import type { OfferingOption } from "@/lib/management/course-offerings";
import { createEnrollmentAction, type EnrollmentFormState } from "../actions";

export function EnrollmentCreateForm({
  students,
  offerings,
}: {
  students: StudentOption[];
  offerings: OfferingOption[];
}) {
  const [state, formAction, pending] = useActionState<EnrollmentFormState | undefined, FormData>(
    createEnrollmentAction,
    undefined
  );

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
        <label htmlFor="course_offering_id" className={labelClasses}>
          Course Offering
        </label>
        <select id="course_offering_id" name="course_offering_id" defaultValue="" required className={fieldClasses}>
          <option value="" disabled>
            Select a course offering
          </option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>
              {o.course.code} — {o.course.name} ({o.semester.academic_year} {o.semester.name}, Sec. {o.section})
              {o.capacity != null ? ` — capacity ${o.capacity}` : ""}
            </option>
          ))}
        </select>
        {offerings.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No non-cancelled course offerings exist yet — create one under Course Offerings first.
          </p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cancelled offerings are excluded. If an offering is at capacity, the enrollment will be rejected.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Enrolling..." : "Create Enrollment"}
        </button>
        <Link
          href="/management/enrollments"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
