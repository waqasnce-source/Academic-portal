import Link from "next/link";

/** Shared table empty-state for modules built from Semesters onward. */
export function EmptyState({
  entityLabelPlural,
  hasActiveFilters,
  clearHref,
}: {
  entityLabelPlural: string;
  hasActiveFilters: boolean;
  clearHref: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
        No {entityLabelPlural} found
      </p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {hasActiveFilters
          ? `No ${entityLabelPlural} match the current filters.`
          : `No ${entityLabelPlural} exist yet.`}
      </p>
      {hasActiveFilters && (
        <Link
          href={clearHref}
          className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
