"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { DEPARTMENT_STATUSES, type DepartmentStatus } from "@/lib/management/status-enums";
import type { DepartmentFormState } from "../actions";

export function DepartmentForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: DepartmentFormState | undefined,
    formData: FormData
  ) => Promise<DepartmentFormState>;
  defaultValues?: { code: string; name: string; status: DepartmentStatus };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
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
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "active"}
          className={fieldClasses}
        >
          {DEPARTMENT_STATUSES.map((s) => (
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
          href="/management/departments"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
