"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { FACULTY_STATUSES } from "@/lib/management/status-enums";
import type { FacultyStatus } from "@/lib/management/faculty";
import type { FacultyFormState } from "../actions";

export function FacultyForm({
  action,
  departments,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: FacultyFormState | undefined,
    formData: FormData
  ) => Promise<FacultyFormState>;
  departments: { id: string; name: string }[];
  defaultValues?: {
    employee_number: string | null;
    name: string;
    email: string | null;
    designation: string;
    department_id: string | null;
    status: FacultyStatus;
    joined_date: string | null;
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
        <label htmlFor="designation" className={labelClasses}>
          Designation
        </label>
        <input
          id="designation"
          name="designation"
          type="text"
          defaultValue={defaultValues?.designation}
          required
          maxLength={200}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="department_id" className={labelClasses}>
          Department (optional)
        </label>
        <select id="department_id" name="department_id" defaultValue={defaultValues?.department_id ?? ""} className={fieldClasses}>
          <option value="">Not assigned</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="employee_number" className={labelClasses}>
            Employee # (optional)
          </label>
          <input
            id="employee_number"
            name="employee_number"
            type="text"
            defaultValue={defaultValues?.employee_number ?? ""}
            maxLength={50}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="faculty_contact_email" className={labelClasses}>
            Email (optional)
          </label>
          <input
            id="faculty_contact_email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            maxLength={255}
            className={fieldClasses}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="joined_date" className={labelClasses}>
          Joined Date (optional)
        </label>
        <input
          id="joined_date"
          name="joined_date"
          type="date"
          defaultValue={defaultValues?.joined_date ?? ""}
          className={fieldClasses}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={defaultValues?.status ?? "active"} className={fieldClasses}>
          {FACULTY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
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
          {pending ? "Saving..." : submitLabel}
        </button>
        <Link href="/management/faculty" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
