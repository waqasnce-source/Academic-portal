import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { ResearchProjectFilters } from "@/lib/management/research-proposals";

export function ResearchProjectFiltersForm({ filters }: { filters: ResearchProjectFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="space-y-1">
        <label htmlFor="q" className={labelClasses}>
          Project Title
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={filters.q}
          placeholder="Search by title..."
          className={fieldClasses}
        />
      </div>
      <button
        type="submit"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
      >
        Search
      </button>
    </form>
  );
}
