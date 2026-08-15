import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getPublicationSummary,
  getPublicationFilterOptions,
  parsePublicationFilters,
} from "@/lib/management/reports/results-publication";
import { ErrorBanner } from "@/app/management/_components/error-banner";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

export default async function ResultsPublicationReportPage(
  props: PageProps<"/management/reports/results-publication">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parsePublicationFilters(rawSearchParams);

  const [summary, filterOptions] = await Promise.all([
    getPublicationSummary(filters),
    getPublicationFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/reports"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Results Publication Status Summary
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          How many recorded results have been published to students vs. still held back.
        </p>
      </div>

      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="q" className={labelClasses}>
            Search by course code or name
          </label>
          <input id="q" name="q" type="text" defaultValue={filters.q} className={fieldClasses} />
        </div>

        <div className="flex min-w-[180px] flex-col gap-1">
          <label htmlFor="semester" className={labelClasses}>
            Semester
          </label>
          <select id="semester" name="semester" defaultValue={filters.semesterId} className={fieldClasses}>
            <option value="">All</option>
            {filterOptions.semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.academic_year} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Apply
          </button>
          <Link
            href="/management/reports/results-publication"
            className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Reset
          </Link>
        </div>
      </form>

      {summary.error ? (
        <ErrorBanner message={summary.error} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total results</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {summary.total.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Published</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
              {summary.published.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Unpublished</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
              {summary.unpublished.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">% Published</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {summary.publishedPercent === null ? "—" : `${summary.publishedPercent}%`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
