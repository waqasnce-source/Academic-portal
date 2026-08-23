import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getSupervisorAssignments,
  hasActiveSupervisorAssignmentFilters,
  parseSupervisorAssignmentFilters,
  buildSupervisorAssignmentsHref,
  SUPERVISOR_ASSIGNMENTS_PAGE_SIZE,
} from "@/lib/management/supervisor-assignments";
import { SupervisorAssignmentFiltersForm } from "./_components/supervisor-assignment-filters-form";
import { SupervisorAssignmentsTable } from "./_components/supervisor-assignments-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementSupervisorAssignmentsPage(
  props: PageProps<"/management/supervisor-assignments">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseSupervisorAssignmentFilters(rawSearchParams);

  const { data: assignments, count, page, error } = await getSupervisorAssignments(filters);
  const totalPages = Math.max(1, Math.ceil(count / SUPERVISOR_ASSIGNMENTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Supervisor Assignments
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} assignment${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/supervisor-assignments/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Assign Supervisor
        </Link>
      </div>

      <SupervisorAssignmentFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <SupervisorAssignmentsTable
            assignments={assignments}
            hasActiveFilters={hasActiveSupervisorAssignmentFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildSupervisorAssignmentsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
