import Link from "next/link";
import { buildSemestersHref, type SemesterFilters } from "@/lib/management/semesters";

const buttonClasses =
  "rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900";
const disabledClasses =
  "rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-300 dark:border-zinc-800 dark:text-zinc-700";

export function SemestersPagination({
  filters,
  page,
  totalPages,
}: {
  filters: SemesterFilters;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <span className={disabledClasses}>Previous</span>
        ) : (
          <Link href={buildSemestersHref(filters, page - 1)} className={buttonClasses}>
            Previous
          </Link>
        )}
        {page >= totalPages ? (
          <span className={disabledClasses}>Next</span>
        ) : (
          <Link href={buildSemestersHref(filters, page + 1)} className={buttonClasses}>
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
