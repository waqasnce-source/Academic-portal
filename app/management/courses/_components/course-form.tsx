"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { COURSE_STATUSES, type CourseStatus } from "@/lib/management/status-enums";
import type { CourseFormState } from "../actions";

export function CourseForm({
  action,
  departments,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: CourseFormState | undefined,
    formData: FormData
  ) => Promise<CourseFormState>;
  departments: { id: string; name: string }[];
  defaultValues?: {
    department_id: string;
    code: string;
    name: string;
    credit_hours: number;
    status: CourseStatus;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="department_id" className={labelClasses}>
          Department
        </label>
        <select
          id="department_id"
          name="department_id"
          defaultValue={defaultValues?.department_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a department
          </option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="code" className={labelClasses}>
          Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          defaultValue={defaultValues?.code}
          required
          maxLength={50}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="name" className={labelClasses}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name}
          required
          maxLength={200}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="credit_hours" className={labelClasses}>
          Credit Hours
        </label>
        <input
          id="credit_hours"
          name="credit_hours"
          type="number"
          min="0.5"
          step="0.5"
          defaultValue={defaultValues?.credit_hours}
          required
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "active"}
          className={fieldClasses}
        >
          {COURSE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
          {state.duplicateCourseId && (
            <>
              {" "}
              <Link href={`/management/courses/${state.duplicateCourseId}/edit`} className="underline">
                Use the existing course instead?
              </Link>
            </>
          )}
        </p>
      )}

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href="/management/courses"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
