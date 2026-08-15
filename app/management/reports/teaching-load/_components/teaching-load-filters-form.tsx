import Link from "next/link";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import {
  type TeachingLoadFilters,
  type TeachingLoadFilterOptions,
} from "@/lib/management/reports/teaching-load";

export function TeachingLoadFiltersForm({
  filters,
  options,
}: {
  filters: TeachingLoadFilters;
  options: TeachingLoadFilterOptions;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by faculty name
        </label>
        <input id="q" name="q" type="text" defaultValue={filters.q} className={fieldClasses} />
      </div>

      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor="semester" className={labelClasses}>
          Semester
        </label>
        <select id="semester" name="semester" defaultValue={filters.semesterId} className={fieldClasses}>
          <option value="">All</option>
          {options.semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.academic_year} — {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="department" className={labelClasses}>
          Department
        </label>
        <select id="department" name="department" defaultValue={filters.departmentId} className={fieldClasses}>
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
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply
        </button>
        <Link
          href="/management/reports/teaching-load"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
