import Link from "next/link";
import { MILESTONE_DEGREE_LEVELS, type MilestoneTemplateFilters } from "@/lib/management/milestones";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

export function MilestoneFiltersForm({ filters }: { filters: MilestoneTemplateFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="degree_level" className={labelClasses}>
          Degree Level
        </label>
        <select id="degree_level" name="degree_level" defaultValue={filters.degreeLevel} className={fieldClasses}>
          <option value="">All</option>
          {MILESTONE_DEGREE_LEVELS.map((d) => (
            <option key={d} value={d}>
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[180px] flex-col gap-1">
        <label htmlFor="category" className={labelClasses}>
          Category
        </label>
        <input
          id="category"
          name="category"
          type="text"
          defaultValue={filters.category}
          placeholder="e.g. Thesis"
          className={fieldClasses}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply
        </button>
        <Link
          href="/management/milestones"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
