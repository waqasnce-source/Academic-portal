import Link from "next/link";
import {
  DEPARTMENT_STATUSES,
  type DepartmentFilters,
} from "@/lib/management/departments";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

/**
 * Plain GET form — no client JS required. Submitting always drops any
 * existing `page` param, resetting pagination whenever filters change.
 *
 * No department dropdown filter (unlike students'/faculty's), since this
 * page IS the department listing — there's no parent to filter by. Search
 * covers both `code` and `name` in one box since both columns live on the
 * departments table itself (no cross-table OR restriction applies here).
 */
export function DepartmentFiltersForm({
  filters,
}: {
  filters: DepartmentFilters;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by code or name
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={filters.q}
          placeholder="e.g. CS or Computer Science"
          className={fieldClasses}
        />
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
          {DEPARTMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
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
          href="/management/departments"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
