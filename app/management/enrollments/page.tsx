import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getEnrollments,
  hasActiveEnrollmentFilters,
  parseEnrollmentFilters,
  buildEnrollmentsHref,
  ENROLLMENTS_PAGE_SIZE,
} from "@/lib/management/enrollments";
import { EnrollmentFiltersForm } from "./_components/enrollment-filters-form";
import { EnrollmentsTable } from "./_components/enrollments-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementEnrollmentsPage(
  props: PageProps<"/management/enrollments">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseEnrollmentFilters(rawSearchParams);

  const { data: enrollments, count, page, error } = await getEnrollments(filters);
  const totalPages = Math.max(1, Math.ceil(count / ENROLLMENTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Enrollments
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} enrollment${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/enrollments/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Enrollment
        </Link>
      </div>

      <EnrollmentFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <EnrollmentsTable
            enrollments={enrollments}
            hasActiveFilters={hasActiveEnrollmentFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildEnrollmentsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
