"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { REQUIREMENT_CATEGORIES, PHD_ENTRY_BASIS_VALUES } from "@/lib/management/status-enums";
import type { CurriculumRequirementFormState } from "../actions";

const CATEGORY_LABELS: Record<(typeof REQUIREMENT_CATEGORIES)[number], string> = {
  general: "General",
  major: "Major / Specialization",
  elective: "Elective",
  seminar: "Seminar",
  project: "Project",
  thesis_research: "Thesis / Research",
};

const ENTRY_BASIS_LABELS: Record<(typeof PHD_ENTRY_BASIS_VALUES)[number], string> = {
  ms_mphil_llm: "PhD entered via MS/MPhil/LLM",
  bs_master: "PhD entered via BS/Master",
};

export interface CurriculumRequirementFormOptions {
  programs: { id: string; code: string; name: string }[];
  specializations: { id: string; name: string; department_id: string }[];
  courses: { id: string; code: string; name: string; credit_hours: number }[];
}

export function CurriculumRequirementForm({
  action,
  options,
  defaultValues,
  submitLabel,
}: {
  action: (
    prevState: CurriculumRequirementFormState | undefined,
    formData: FormData
  ) => Promise<CurriculumRequirementFormState>;
  options: CurriculumRequirementFormOptions;
  defaultValues?: {
    program_id: string;
    specialization_id: string | null;
    course_id: string | null;
    requirement_category: string;
    required_credit_hours: number | null;
    recommended_semester: number | null;
    is_mandatory: boolean;
    applicable_entry_basis: string | null;
  };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [mode, setMode] = useState<"course" | "category">(
    defaultValues?.course_id ? "course" : "category"
  );

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-5 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="program_id" className={labelClasses}>
          Program
        </label>
        <select
          id="program_id"
          name="program_id"
          defaultValue={defaultValues?.program_id ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a program
          </option>
          {options.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="specialization_id" className={labelClasses}>
          Specialization
        </label>
        <select
          id="specialization_id"
          name="specialization_id"
          defaultValue={defaultValues?.specialization_id ?? ""}
          className={fieldClasses}
        >
          <option value="">Applies to all specializations in this program</option>
          {options.specializations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label htmlFor="requirement_category" className={labelClasses}>
          Requirement Category
        </label>
        <select
          id="requirement_category"
          name="requirement_category"
          defaultValue={defaultValues?.requirement_category ?? ""}
          required
          className={fieldClasses}
        >
          <option value="" disabled>
            Select a category
          </option>
          {REQUIREMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          What does this requirement refer to?
        </legend>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="requirement_mode"
              value="course"
              checked={mode === "course"}
              onChange={() => setMode("course")}
              className="h-4 w-4 border-slate-300 dark:border-slate-700"
            />
            Specific course requirement
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="requirement_mode"
              value="category"
              checked={mode === "category"}
              onChange={() => setMode("category")}
              className="h-4 w-4 border-slate-300 dark:border-slate-700"
            />
            Category credit-hour target
          </label>
        </div>

        {mode === "course" ? (
          <div className="space-y-1">
            <label htmlFor="course_id" className={labelClasses}>
              Course
            </label>
            <select
              id="course_id"
              name="course_id"
              defaultValue={defaultValues?.course_id ?? ""}
              required
              className={fieldClasses}
            >
              <option value="" disabled>
                Select a course
              </option>
              {options.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.credit_hours} CH)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This specific course is the requirement — its credit hours come from the course catalog, not a
              separately entered number.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <label htmlFor="required_credit_hours" className={labelClasses}>
              Required Credit Hours
            </label>
            <input
              id="required_credit_hours"
              name="required_credit_hours"
              type="number"
              min="0.1"
              step="0.1"
              defaultValue={defaultValues?.required_credit_hours ?? ""}
              required
              className={fieldClasses}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              E.g. &ldquo;6 CH of Elective&rdquo; — satisfied by any combination of courses in this category, not
              one specific course.
            </p>
          </div>
        )}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="recommended_semester" className={labelClasses}>
            Recommended Semester
          </label>
          <input
            id="recommended_semester"
            name="recommended_semester"
            type="number"
            min="1"
            step="1"
            defaultValue={defaultValues?.recommended_semester ?? ""}
            className={fieldClasses}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="applicable_entry_basis" className={labelClasses}>
            PhD Entry Basis
          </label>
          <select
            id="applicable_entry_basis"
            name="applicable_entry_basis"
            defaultValue={defaultValues?.applicable_entry_basis ?? ""}
            className={fieldClasses}
          >
            <option value="">Applies regardless of entry basis</option>
            {PHD_ENTRY_BASIS_VALUES.map((b) => (
              <option key={b} value={b}>
                {ENTRY_BASIS_LABELS[b]}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400">Only meaningful for PhD programs.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="is_mandatory"
          name="is_mandatory"
          type="checkbox"
          defaultChecked={defaultValues?.is_mandatory ?? true}
          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        <label htmlFor="is_mandatory" className={labelClasses}>
          Mandatory
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
          href="/management/curriculum-requirements"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
