import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getDepartments,
  hasActiveDepartmentFilters,
  parseDepartmentFilters,
  DEPARTMENTS_PAGE_SIZE,
} from "@/lib/management/departments";
import { DepartmentFiltersForm } from "./_components/department-filters-form";
import { DepartmentsTable } from "./_components/departments-table";
import { DepartmentsPagination } from "./_components/departments-pagination";

export default async function ManagementDepartmentsPage(
  props: PageProps<"/management/departments">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseDepartmentFilters(rawSearchParams);

  const { data: departments, count, page, error } = await getDepartments(filters);

  // getDepartments() already clamped an out-of-range `page` to the last
  // valid page before querying, so `page` here is always safe to render.
  const totalPages = Math.max(1, Math.ceil(count / DEPARTMENTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Department Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} department${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/departments/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Department
        </Link>
      </div>

      <DepartmentFiltersForm filters={filters} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <DepartmentsTable
            departments={departments}
            hasActiveFilters={hasActiveDepartmentFilters(filters)}
          />
          {count > 0 && (
            <DepartmentsPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
