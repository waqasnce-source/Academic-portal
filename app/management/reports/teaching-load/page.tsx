import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getTeachingLoadReport,
  getTeachingLoadFilterOptions,
  hasActiveTeachingLoadFilters,
  parseTeachingLoadFilters,
  buildTeachingLoadHref,
  TEACHING_LOAD_PAGE_SIZE,
} from "@/lib/management/reports/teaching-load";
import { TeachingLoadFiltersForm } from "./_components/teaching-load-filters-form";
import { TeachingLoadTable } from "./_components/teaching-load-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function TeachingLoadReportPage(
  props: PageProps<"/management/reports/teaching-load">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseTeachingLoadFilters(rawSearchParams);

  const [{ data: rows, count, page, error }, filterOptions] = await Promise.all([
    getTeachingLoadReport(filters),
    getTeachingLoadFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / TEACHING_LOAD_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/reports"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Faculty Teaching Load
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error ? "—" : `${count.toLocaleString()} faculty member${count === 1 ? "" : "s"} with an assignment`}
        </p>
      </div>

      <TeachingLoadFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <TeachingLoadTable rows={rows} hasActiveFilters={hasActiveTeachingLoadFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildTeachingLoadHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
