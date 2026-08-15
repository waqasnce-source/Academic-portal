import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCapacityReport,
  getCapacityFilterOptions,
  hasActiveCapacityFilters,
  parseCapacityFilters,
  buildCapacityHref,
  CAPACITY_REPORT_PAGE_SIZE,
} from "@/lib/management/reports/enrollment-capacity";
import { CapacityFiltersForm } from "./_components/capacity-filters-form";
import { CapacityTable } from "./_components/capacity-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function EnrollmentCapacityReportPage(
  props: PageProps<"/management/reports/enrollment-capacity">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseCapacityFilters(rawSearchParams);

  const [{ data: rows, count, page, error }, filterOptions] = await Promise.all([
    getCapacityReport(filters),
    getCapacityFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / CAPACITY_REPORT_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/reports"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Enrollment Headcount &amp; Capacity Utilization
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {error ? "—" : `${count.toLocaleString()} offering${count === 1 ? "" : "s"} found`}
        </p>
      </div>

      <CapacityFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <CapacityTable
            rows={rows}
            statusLabel={`${filters.status[0].toUpperCase()}${filters.status.slice(1)} enrolled`}
            hasActiveFilters={hasActiveCapacityFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildCapacityHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
