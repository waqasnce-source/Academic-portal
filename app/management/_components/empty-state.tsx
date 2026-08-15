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
    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        No {entityLabelPlural} found
      </p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {hasActiveFilters
          ? `No ${entityLabelPlural} match the current filters.`
          : `No ${entityLabelPlural} exist yet.`}
      </p>
      {hasActiveFilters && (
        <Link
          href={clearHref}
          className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
