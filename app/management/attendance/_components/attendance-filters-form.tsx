import Link from "next/link";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { ATTENDANCE_STATUSES, type AttendanceFilters } from "@/lib/management/attendance";

export function AttendanceFiltersForm({ filters }: { filters: AttendanceFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select id="status" name="status" defaultValue={filters.status} className={fieldClasses}>
          <option value="">All</option>
          {ATTENDANCE_STATUSES.map((s) => (
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
          href="/management/attendance"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
