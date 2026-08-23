"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { SpecializationFormState } from "../actions";

export function SpecializationForm({
  action,
  departments,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: SpecializationFormState | undefined,
    formData: FormData
  ) => Promise<SpecializationFormState>;
  departments: { id: string; name: string }[];
  defaultValues?: {
    department_id: string;
    code: string | null;
    name: string;
    description: string | null;
    is_active: boolean;
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
        <label htmlFor="code" className={labelClasses}>
          Code (optional)
        </label>
        <input
          id="code"
          name="code"
          type="text"
          defaultValue={defaultValues?.code ?? ""}
          maxLength={50}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="description" className={labelClasses}>
          Description (optional)
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={3}
          maxLength={2000}
          className={fieldClasses}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          defaultChecked={defaultValues?.is_active ?? true}
          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        <label htmlFor="is_active" className={labelClasses}>
          Active
        </label>
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
          href="/management/specializations"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
