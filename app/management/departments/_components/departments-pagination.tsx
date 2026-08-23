import Link from "next/link";
import { buildDepartmentsHref, type DepartmentFilters } from "@/lib/management/departments";

const buttonClasses =
  "rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900";
const disabledClasses =
  "rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300 dark:border-slate-800 dark:text-slate-700";

export function DepartmentsPagination({
  filters,
  page,
  totalPages,
}: {
  filters: DepartmentFilters;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <span className={disabledClasses}>Previous</span>
        ) : (
          <Link href={buildDepartmentsHref(filters, page - 1)} className={buttonClasses}>
            Previous
          </Link>
        )}
        {page >= totalPages ? (
          <span className={disabledClasses}>Next</span>
        ) : (
          <Link href={buildDepartmentsHref(filters, page + 1)} className={buttonClasses}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
