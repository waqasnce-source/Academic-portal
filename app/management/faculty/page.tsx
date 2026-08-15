import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getFaculty,
  getFacultyFilterOptions,
  hasActiveFacultyFilters,
  parseFacultyFilters,
  FACULTY_PAGE_SIZE,
} from "@/lib/management/faculty";
import { FacultyFiltersForm } from "./_components/faculty-filters-form";
import { FacultyTable } from "./_components/faculty-table";
import { FacultyPagination } from "./_components/faculty-pagination";

export default async function ManagementFacultyPage(
  props: PageProps<"/management/faculty">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseFacultyFilters(rawSearchParams);

  const [{ data: faculty, count, page, error }, filterOptions] = await Promise.all([
    getFaculty(filters),
    getFacultyFilterOptions(),
  ]);

  // getFaculty() already clamped an out-of-range `page` to the last valid
  // page before querying, so `page` here is always safe to render.
  const totalPages = Math.max(1, Math.ceil(count / FACULTY_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Faculty Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error
              ? "—"
              : `${count.toLocaleString()} faculty member${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/faculty/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <>
          <FacultyTable
            faculty={faculty}
            hasActiveFilters={hasActiveFacultyFilters(filters)}
          />
          {count > 0 && (
            <FacultyPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
