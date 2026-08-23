import Link from "next/link";
import type {
  CurriculumRequirementFilters,
  CurriculumRequirementFilterOptions,
} from "@/lib/management/curriculum-requirements";
import { REQUIREMENT_CATEGORIES } from "@/lib/management/status-enums";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

export function CurriculumRequirementFiltersForm({
  filters,
  options,
}: {
  filters: CurriculumRequirementFilters;
  options: CurriculumRequirementFilterOptions;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor="program" className={labelClasses}>
          Program
        </label>
        <select id="program" name="program" defaultValue={filters.programId} className={fieldClasses}>
          <option value="">All</option>
          {options.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor="specialization" className={labelClasses}>
          Specialization
        </label>
        <select
          id="specialization"
          name="specialization"
          defaultValue={filters.specializationId}
          className={fieldClasses}
        >
          <option value="">All</option>
          {options.specializations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="category" className={labelClasses}>
          Category
        </label>
        <select id="category" name="category" defaultValue={filters.category} className={fieldClasses}>
          <option value="">All</option>
          {REQUIREMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Apply
        </button>
        <Link
          href="/management/curriculum-requirements"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
