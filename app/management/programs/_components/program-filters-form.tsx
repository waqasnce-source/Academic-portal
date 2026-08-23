import Link from "next/link";
import {
  DEGREE_LEVELS,
  PROGRAM_STATUSES,
  type ProgramFilters,
  type ProgramFilterOptions,
} from "@/lib/management/programs";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

const DEGREE_LEVEL_LABELS: Record<(typeof DEGREE_LEVELS)[number], string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD",
};

/** Plain GET form — no client JS required. Submitting drops any existing `page` param. */
export function ProgramFiltersForm({
  filters,
  options,
}: {
  filters: ProgramFilters;
  options: ProgramFilterOptions;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by code or name
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={filters.q}
          placeholder="e.g. BSCS or Computer Science"
          className={fieldClasses}
        />
      </div>

      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="degree_level" className={labelClasses}>
          Degree Level
        </label>
        <select
          id="degree_level"
          name="degree_level"
          defaultValue={filters.degreeLevel}
          className={fieldClasses}
        >
          <option value="">All</option>
          {DEGREE_LEVELS.map((d) => (
            <option key={d} value={d}>
              {DEGREE_LEVEL_LABELS[d]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={filters.status}
          className={fieldClasses}
        >
          <option value="">All</option>
          {PROGRAM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="department" className={labelClasses}>
          Department
        </label>
        <select
          id="department"
          name="department"
          defaultValue={filters.departmentId}
          className={fieldClasses}
        >
          <option value="">All</option>
          {options.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
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
          href="/management/programs"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
