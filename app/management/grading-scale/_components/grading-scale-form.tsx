"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { GRADING_SCALE_STATUSES } from "@/lib/management/status-enums";
import type { GradingScaleFormState } from "../actions";

export function GradingScaleForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: GradingScaleFormState | undefined,
    formData: FormData
  ) => Promise<GradingScaleFormState>;
  defaultValues?: {
    name: string;
    min_marks: number;
    max_marks: number;
    letter_grade: string;
    grade_point: number;
    is_passing: boolean;
    status: string;
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
        <label htmlFor="name" className={labelClasses}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={defaultValues?.name}
          required
          maxLength={100}
          placeholder="e.g. Excellent"
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="letter_grade" className={labelClasses}>
          Letter Grade
        </label>
        <input
          id="letter_grade"
          name="letter_grade"
          type="text"
          defaultValue={defaultValues?.letter_grade}
          required
          maxLength={20}
          placeholder="e.g. A"
          className={fieldClasses}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="min_marks" className={labelClasses}>
            Minimum Marks
          </label>
          <input
            id="min_marks"
            name="min_marks"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.min_marks}
            required
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="max_marks" className={labelClasses}>
            Maximum Marks
          </label>
          <input
            id="max_marks"
            name="max_marks"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.max_marks}
            required
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="grade_point" className={labelClasses}>
          Grade Point
        </label>
        <input
          id="grade_point"
          name="grade_point"
          type="number"
          min="0"
          step="0.01"
          defaultValue={defaultValues?.grade_point}
          required
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={defaultValues?.status ?? "active"} className={fieldClasses}>
          {GRADING_SCALE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "active" ? "Active" : "Inactive"}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Only active bands are checked for overlapping mark ranges against each other.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_passing"
          name="is_passing"
          type="checkbox"
          defaultChecked={defaultValues?.is_passing ?? true}
          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        <label htmlFor="is_passing" className={labelClasses}>
          Passing grade
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href="/management/grading-scale"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
