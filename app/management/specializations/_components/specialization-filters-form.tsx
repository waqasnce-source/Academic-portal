import Link from "next/link";
import type { SpecializationFilters, SpecializationFilterOptions } from "@/lib/management/specializations";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

export function SpecializationFiltersForm({
  filters,
  options,
}: {
  filters: SpecializationFilters;
  options: SpecializationFilterOptions;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by name or code
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={filters.q}
          placeholder="e.g. Hydrogeophysics"
          className={fieldClasses}
        />
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

      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="is_active" className={labelClasses}>
          Status
        </label>
        <select id="is_active" name="is_active" defaultValue={filters.isActive} className={fieldClasses}>
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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
          href="/management/specializations"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
