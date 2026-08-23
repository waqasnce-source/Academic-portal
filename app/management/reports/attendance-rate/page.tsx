import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getAttendanceRateReport,
  getAttendanceRateFilterOptions,
  hasActiveAttendanceRateFilters,
  parseAttendanceRateFilters,
  buildAttendanceRateHref,
  ATTENDANCE_RATE_PAGE_SIZE,
} from "@/lib/management/reports/attendance-rate";
import { AttendanceRateFiltersForm } from "./_components/attendance-rate-filters-form";
import { AttendanceRateTable } from "./_components/attendance-rate-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function AttendanceRateReportPage(
  props: PageProps<"/management/reports/attendance-rate">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseAttendanceRateFilters(rawSearchParams);

  const [{ data: rows, count, page, error }, filterOptions] = await Promise.all([
    getAttendanceRateReport(filters),
    getAttendanceRateFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / ATTENDANCE_RATE_PAGE_SIZE));

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
          Attendance Rate by Offering
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error ? "—" : `${count.toLocaleString()} course offering${count === 1 ? "" : "s"} with recorded attendance`}
        </p>
      </div>

      <AttendanceRateFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <AttendanceRateTable rows={rows} hasActiveFilters={hasActiveAttendanceRateFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildAttendanceRateHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
