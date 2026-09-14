import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getFaculty,
  getFacultyFilterOptions,
  hasActiveFacultyFilters,
  parseFacultyFilters,
} from "@/lib/management/faculty";
import { FacultyFiltersForm } from "./_components/faculty-filters-form";
import { FacultyTable } from "./_components/faculty-table";

export default async function ManagementFacultyPage(
  props: PageProps<"/management/faculty">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseFacultyFilters(rawSearchParams);

  const [{ data: faculty, count, error }, filterOptions] = await Promise.all([
    getFaculty(filters),
    getFacultyFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Faculty Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} faculty member${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/faculty/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Faculty
        </Link>
      </div>

      <FacultyFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <FacultyTable
          faculty={faculty}
          hasActiveFilters={hasActiveFacultyFilters(filters)}
          groupByDiscipline={!filters.departmentId}
        />
      )}
    </div>
  );
}
