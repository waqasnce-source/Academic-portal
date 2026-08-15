"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { SEMESTER_STATUSES, type SemesterStatus } from "@/lib/management/status-enums";
import type { SemesterFormState } from "../actions";

export function SemesterForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: SemesterFormState | undefined,
    formData: FormData
  ) => Promise<SemesterFormState>;
  defaultValues?: {
    academic_year: string;
    name: string;
    start_date: string;
    end_date: string;
    status: SemesterStatus;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="space-y-1">
        <label htmlFor="academic_year" className={labelClasses}>
          Academic Year
        </label>
        <input
          id="academic_year"
          name="academic_year"
          type="text"
          defaultValue={defaultValues?.academic_year}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="start_date" className={labelClasses}>
            Start Date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={defaultValues?.start_date}
            required
            className={fieldClasses}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="end_date" className={labelClasses}>
            End Date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={defaultValues?.end_date}
            required
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "upcoming"}
          className={fieldClasses}
        >
          {SEMESTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href="/management/semesters"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
