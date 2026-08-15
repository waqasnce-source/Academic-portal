import Link from "next/link";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { WEEKDAY_LABELS, type TimetableFilters } from "@/lib/management/timetables";

export function TimetableFiltersForm({ filters }: { filters: TimetableFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="day" className={labelClasses}>
          Day of week
        </label>
        <select id="day" name="day" defaultValue={filters.dayOfWeek} className={fieldClasses}>
          <option value="">All</option>
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {label}
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
          href="/management/timetable"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
