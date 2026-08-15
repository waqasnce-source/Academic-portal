import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCourseOfferings,
  getCourseOfferingFilterOptions,
  hasActiveCourseOfferingFilters,
  parseCourseOfferingFilters,
  buildCourseOfferingsHref,
  OFFERINGS_PAGE_SIZE,
} from "@/lib/management/course-offerings";
import { OfferingFiltersForm } from "./_components/offering-filters-form";
import { OfferingsTable } from "./_components/offerings-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementCourseOfferingsPage(
  props: PageProps<"/management/course-offerings">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseCourseOfferingFilters(rawSearchParams);

  const [{ data: offerings, count, page, error }, filterOptions] = await Promise.all([
    getCourseOfferings(filters),
    getCourseOfferingFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / OFFERINGS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Course Offerings
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error
              ? "—"
              : `${count.toLocaleString()} offering${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/course-offerings/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add Offering
        </Link>
      </div>

      <OfferingFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <OfferingsTable
            offerings={offerings}
            hasActiveFilters={hasActiveCourseOfferingFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildCourseOfferingsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
