import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import type { ResearchProjectFilters } from "@/lib/management/research-proposals";

export function ResearchProjectFiltersForm({ filters }: { filters: ResearchProjectFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
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
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        Search
      </button>
    </form>
  );
}
