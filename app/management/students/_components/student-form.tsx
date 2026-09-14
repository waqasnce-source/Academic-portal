"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
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

  // Discipline is a pure client-side filter over the already-fetched
  // specialization list (small, bounded dataset) — narrows the
  // Specialization select instead of leaving one long alphabetical list,
  // same pattern as the course-offering form's Degree Level/Discipline
  // filters. Pre-seeded from the default specialization (edit form) so it
  // doesn't reset to blank when editing an existing student.
  const defaultSpecialization = specializations.find((s) => s.id === defaultValues?.specialization_id) ?? null;
  const [disciplineId, setDisciplineId] = useState<string>(defaultSpecialization?.department.id ?? "");

  const disciplines = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const s of specializations) map.set(s.department.id, s.department);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [specializations]);

  const specializationsForDiscipline = useMemo(
    () => specializations.filter((s) => !disciplineId || s.department.id === disciplineId),
    [specializations, disciplineId]
  );

  return (
    <form
      action={formAction}
      className="max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
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
          <label htmlFor="discipline_filter" className={labelClasses}>
            Discipline
          </label>
          <select
            id="discipline_filter"
            className={fieldClasses}
            value={disciplineId}
            onChange={(e) => setDisciplineId(e.target.value)}
          >
            <option value="">All</option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="specialization_id" className={labelClasses}>
          Specialization (optional)
        </label>
        <select id="specialization_id" name="specialization_id" defaultValue={defaultValues?.specialization_id ?? ""} className={fieldClasses}>
          <option value="">Not assigned</option>
          {specializationsForDiscipline.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {specializations.length > 0 && specializationsForDiscipline.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">No specializations exist for this discipline.</p>
        )}
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

      {state?.error && (
        <p
          className={`text-sm ${
            state.needsConfirmation
              ? "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.error}
          {state.duplicateStudentId && (
            <>
              {" "}
              <Link href={`/management/students/${state.duplicateStudentId}`} className="underline">
                View existing student
              </Link>
            </>
          )}
        </p>
      )}

      <input type="hidden" name="confirmed" value={state?.needsConfirmation ? "true" : "false"} />

      <div className="flex items-center gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          {pending ? "Saving..." : state?.needsConfirmation ? "Create Anyway" : submitLabel}
        </button>
        <Link href="/management/students" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}
