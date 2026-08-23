import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCurriculumRequirements,
  getCurriculumRequirementFilterOptions,
  hasActiveCurriculumRequirementFilters,
  parseCurriculumRequirementFilters,
  buildCurriculumRequirementsHref,
  CURRICULUM_REQUIREMENTS_PAGE_SIZE,
} from "@/lib/management/curriculum-requirements";
import { CurriculumRequirementFiltersForm } from "./_components/curriculum-requirement-filters-form";
import { CurriculumRequirementsTable } from "./_components/curriculum-requirements-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementCurriculumRequirementsPage(
  props: PageProps<"/management/curriculum-requirements">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseCurriculumRequirementFilters(rawSearchParams);

  const [{ data: requirements, count, page, error }, filterOptions] = await Promise.all([
    getCurriculumRequirements(filters),
    getCurriculumRequirementFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / CURRICULUM_REQUIREMENTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Curriculum Requirements
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error ? "—" : `${count.toLocaleString()} requirement${count === 1 ? "" : "s"} configured`}
          </p>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
            Configuration only — no requirements are pre-populated from the course catalog. Add a row here only
            once the actual degree requirement (specific course or category credit target) has been confirmed.
          </p>
        </div>
        <Link
          href="/management/curriculum-requirements/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Requirement
        </Link>
      </div>

      <CurriculumRequirementFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <CurriculumRequirementsTable
            requirements={requirements}
            hasActiveFilters={hasActiveCurriculumRequirementFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildCurriculumRequirementsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
