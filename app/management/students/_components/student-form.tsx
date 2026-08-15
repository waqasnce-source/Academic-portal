"use client";

import Link from "next/link";
import { useActionState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { STUDENT_STATUSES, PHD_ENTRY_BASIS_VALUES } from "@/lib/management/status-enums";
import type { StudentStatus } from "@/lib/management/students";
import type { StudentProgramOption, StudentSpecializationOption } from "@/lib/management/students";
import type { StudentFormState } from "../actions";

const PHD_ENTRY_BASIS_LABELS: Record<string, string> = {
  ms_mphil_llm: "MS/MPhil/LLM entry",
  bs_master: "BS/Master entry",
};

export function StudentForm({
  action,
  programs,
  specializations,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: StudentFormState | undefined,
    formData: FormData
  ) => Promise<StudentFormState>;
  programs: StudentProgramOption[];
  specializations: StudentSpecializationOption[];
  defaultValues?: {
    student_number: string;
    name: string;
    email: string | null;
    program_id: string;
    admission_year: number;
    specialization_id: string | null;
    phd_entry_basis: string | null;
    status: StudentStatus;
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
        <input id="name" name="name" type="text" defaultValue={defaultValues?.name} required maxLength={200} className={fieldClasses} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="student_number" className={labelClasses}>
            Student Number
          </label>
          <input
            id="student_number"
            name="student_number"
            type="text"
            defaultValue={defaultValues?.student_number}
            required
            maxLength={50}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className={labelClasses}>
            Email (optional)
          </label>
          <input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} maxLength={255} className={fieldClasses} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="program_id" className={labelClasses}>
          Program
        </label>
        <select id="program_id" name="program_id" defaultValue={defaultValues?.program_id ?? ""} required className={fieldClasses}>
          <option value="" disabled>
            Select a program
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.degree_level})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="admission_year" className={labelClasses}>
            Admission Year
          </label>
          <input
            id="admission_year"
            name="admission_year"
            type="number"
            min="2000"
            max="2100"
            defaultValue={defaultValues?.admission_year}
            required
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="specialization_id" className={labelClasses}>
            Specialization (optional)
          </label>
          <select id="specialization_id" name="specialization_id" defaultValue={defaultValues?.specialization_id ?? ""} className={fieldClasses}>
            <option value="">Not assigned</option>
            {specializations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="phd_entry_basis" className={labelClasses}>
          PhD Entry Basis (PhD students only)
        </label>
        <select id="phd_entry_basis" name="phd_entry_basis" defaultValue={defaultValues?.phd_entry_basis ?? ""} className={fieldClasses}>
          <option value="">Not applicable</option>
          {PHD_ENTRY_BASIS_VALUES.map((v) => (
            <option key={v} value={v}>
              {PHD_ENTRY_BASIS_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={defaultValues?.status ?? "active"} className={fieldClasses}>
          {STUDENT_STATUSES.map((s) => (
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
        <Link href="/management/students" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
