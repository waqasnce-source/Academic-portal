"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import {
  PROGRAM_STATUSES,
  DEGREE_LEVELS,
  type ProgramStatus,
  type DegreeLevel,
} from "@/lib/management/status-enums";
import type { ProgramFormState } from "../actions";

export function ProgramForm({
  action,
  departments,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: ProgramFormState | undefined,
    formData: FormData
  ) => Promise<ProgramFormState>;
  departments: { id: string; name: string }[];
  defaultValues?: {
    department_id: string;
    code: string;
    name: string;
    degree_level: DegreeLevel;
    duration_years: number | null;
    duration_verified: boolean;
    status: ProgramStatus;
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
        <label htmlFor="degree_level" className={labelClasses}>
          Degree Level
        </label>
        <select
          id="degree_level"
          name="degree_level"
          defaultValue={defaultValues?.degree_level ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a degree level
          </option>
          {DEGREE_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level[0].toUpperCase() + level.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="duration_years" className={labelClasses}>
          Duration (years) — leave blank until confirmed
        </label>
        <input
          id="duration_years"
          name="duration_years"
          type="number"
          min="0.5"
          step="0.5"
          defaultValue={defaultValues?.duration_years ?? ""}
          className={fieldClasses}
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No official duration is on file for most programs yet — this can stay empty until the real NCEG/University
          of Peshawar regulation is confirmed.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="duration_verified"
          name="duration_verified"
          type="checkbox"
          defaultChecked={defaultValues?.duration_verified ?? false}
          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        <label htmlFor="duration_verified" className="text-sm text-slate-700 dark:text-slate-300">
          Duration confirmed against an official regulation
        </label>
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
          {PROGRAM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
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
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link
          href="/management/programs"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
