import { requireRole } from "@/lib/supabase/dal";
import {
  getAttendance,
  hasActiveAttendanceFilters,
  parseAttendanceFilters,
  buildAttendanceHref,
  ATTENDANCE_PAGE_SIZE,
} from "@/lib/management/attendance";
import { AttendanceFiltersForm } from "./_components/attendance-filters-form";
import { AttendanceTable } from "./_components/attendance-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementAttendancePage(
  props: PageProps<"/management/attendance">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseAttendanceFilters(rawSearchParams);

  const { data: records, count, page, error } = await getAttendance(filters);
  const totalPages = Math.max(1, Math.ceil(count / ATTENDANCE_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error
            ? "—"
            : `${count.toLocaleString()} record${count === 1 ? "" : "s"} found`}
        </p>
      </div>

      <AttendanceFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <AttendanceTable
            records={records}
            hasActiveFilters={hasActiveAttendanceFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildAttendanceHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
