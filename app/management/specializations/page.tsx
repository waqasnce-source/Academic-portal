import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getSpecializations,
  getSpecializationFilterOptions,
  hasActiveSpecializationFilters,
  parseSpecializationFilters,
  buildSpecializationsHref,
  SPECIALIZATIONS_PAGE_SIZE,
} from "@/lib/management/specializations";
import { SpecializationFiltersForm } from "./_components/specialization-filters-form";
import { SpecializationsTable } from "./_components/specializations-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementSpecializationsPage(
  props: PageProps<"/management/specializations">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseSpecializationFilters(rawSearchParams);

  const [{ data: specializations, count, page, error }, filterOptions] = await Promise.all([
    getSpecializations(filters),
    getSpecializationFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / SPECIALIZATIONS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Specialization Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} specialization${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/specializations/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Specialization
        </Link>
      </div>

      <SpecializationFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <SpecializationsTable
            specializations={specializations}
            hasActiveFilters={hasActiveSpecializationFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildSpecializationsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
