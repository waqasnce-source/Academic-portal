import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getSemesters,
  hasActiveSemesterFilters,
  parseSemesterFilters,
  SEMESTERS_PAGE_SIZE,
} from "@/lib/management/semesters";
import { SemesterFiltersForm } from "./_components/semester-filters-form";
import { SemestersTable } from "./_components/semesters-table";
import { SemestersPagination } from "./_components/semesters-pagination";

export default async function ManagementSemestersPage(
  props: PageProps<"/management/semesters">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseSemesterFilters(rawSearchParams);

  const { data: semesters, count, page, error } = await getSemesters(filters);

  // getSemesters() already clamped an out-of-range `page` to the last
  // valid page before querying, so `page` here is always safe to render.
  const totalPages = Math.max(1, Math.ceil(count / SEMESTERS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Semester Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error
              ? "—"
              : `${count.toLocaleString()} semester${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/semesters/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add Semester
        </Link>
      </div>

      <SemesterFiltersForm filters={filters} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <SemestersTable
            semesters={semesters}
            hasActiveFilters={hasActiveSemesterFilters(filters)}
          />
          {count > 0 && (
            <SemestersPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
