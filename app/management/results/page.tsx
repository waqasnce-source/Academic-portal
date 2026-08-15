import { requireRole } from "@/lib/supabase/dal";
import {
  getResults,
  hasActiveResultFilters,
  parseResultFilters,
  buildResultsHref,
  RESULTS_PAGE_SIZE,
} from "@/lib/management/results";
import { ResultFiltersForm } from "./_components/result-filters-form";
import { ResultsTable } from "./_components/results-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementResultsPage(
  props: PageProps<"/management/results">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseResultFilters(rawSearchParams);

  const { data: results, count, page, error } = await getResults(filters);
  const totalPages = Math.max(1, Math.ceil(count / RESULTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Results
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {error
            ? "—"
            : `${count.toLocaleString()} result${count === 1 ? "" : "s"} found`}
        </p>
      </div>

      <ResultFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <ResultsTable results={results} hasActiveFilters={hasActiveResultFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildResultsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
