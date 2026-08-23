import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getPrograms,
  getProgramFilterOptions,
  hasActiveProgramFilters,
  parseProgramFilters,
  PROGRAMS_PAGE_SIZE,
} from "@/lib/management/programs";
import { ProgramFiltersForm } from "./_components/program-filters-form";
import { ProgramsTable } from "./_components/programs-table";
import { ProgramsPagination } from "./_components/programs-pagination";

export default async function ManagementProgramsPage(
  props: PageProps<"/management/programs">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseProgramFilters(rawSearchParams);

  const [{ data: programs, count, page, error }, filterOptions] = await Promise.all([
    getPrograms(filters),
    getProgramFilterOptions(),
  ]);

  // getPrograms() already clamped an out-of-range `page` to the last valid
  // page before querying, so `page` here is always safe to render.
  const totalPages = Math.max(1, Math.ceil(count / PROGRAMS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Program Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} program${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/programs/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Program
        </Link>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href="/management/departments" className="text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
          Departments
        </Link>
        <Link href="/management/specializations" className="text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
          Specializations
        </Link>
        <Link
          href="/management/curriculum-requirements"
          className="text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          Curriculum Requirements
        </Link>
      </div>

      <ProgramFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <ProgramsTable
            programs={programs}
            hasActiveFilters={hasActiveProgramFilters(filters)}
          />
          {count > 0 && (
            <ProgramsPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
