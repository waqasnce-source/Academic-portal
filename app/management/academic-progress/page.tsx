import { requireRole } from "@/lib/supabase/dal";
import {
  getAcademicProgressOverview,
  getAcademicProgressStatusTiles,
  getAcademicProgressFilterOptions,
  parseAcademicProgressFilters,
  hasActiveAcademicProgressFilters,
  buildAcademicProgressHref,
  ACADEMIC_PROGRESS_PAGE_SIZE,
} from "@/lib/management/academic-progress";
import { ProgressOverviewTable } from "./_components/progress-overview-table";
import { ProgressFiltersForm } from "./_components/progress-filters-form";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementAcademicProgressPage(
  props: PageProps<"/management/academic-progress">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseAcademicProgressFilters(rawSearchParams);

  const [overview, tiles, filterOptions] = await Promise.all([
    getAcademicProgressOverview(filters),
    getAcademicProgressStatusTiles(),
    getAcademicProgressFilterOptions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(overview.count / ACADEMIC_PROGRESS_PAGE_SIZE));

  const summaryTiles: { label: string; value: number; tone: "neutral" | "success" | "warning" | "danger" | "info" }[] = [
    { label: "Active students", value: tiles.totalStudents, tone: "neutral" },
    { label: "On track", value: tiles.byStatusLabel.ON_TRACK, tone: "success" },
    { label: "Due soon", value: tiles.byStatusLabel.DUE_SOON, tone: "warning" },
    { label: "Delayed", value: tiles.byStatusLabel.DELAYED, tone: "danger" },
    { label: "Extended", value: tiles.byStatusLabel.EXTENDED, tone: "info" },
    { label: "Completed", value: tiles.byStatusLabel.COMPLETED, tone: "success" },
    { label: "On hold", value: tiles.byStatusLabel.ON_HOLD, tone: "warning" },
    { label: "Requiring action", value: tiles.requiringAction, tone: "danger" },
  ];

  const TILE_TONE_CLASSES: Record<string, string> = {
    neutral: "text-slate-900 dark:text-slate-50",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-red-600 dark:text-red-400",
    info: "text-blue-600 dark:text-blue-400",
  };
  const TILE_DOT_CLASSES: Record<string, string> = {
    neutral: "bg-slate-400 dark:bg-slate-600",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Academic Progress
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Institution-wide academic status, computed live from milestone records, enrollments, supervisor
          assignments, research proposals, and thesis records — nothing here is stored separately.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryTiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TILE_DOT_CLASSES[tile.tone]}`} />
              {tile.label}
            </p>
            <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${TILE_TONE_CLASSES[tile.tone]}`}>{tile.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <ProgressFiltersForm filters={filters} options={filterOptions} currentAcademicYear={overview.currentAcademicYear} />

      {overview.capped && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Stage/Overall Status filtering is showing results from the first {overview.count.toLocaleString()}+ matching
          students — narrow with another filter (e.g. Discipline or Program) for a complete count at this scale.
        </p>
      )}

      {overview.error ? (
        <ErrorBanner message={overview.error} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {overview.count.toLocaleString()} student{overview.count === 1 ? "" : "s"} found
            {!filters.academicYear && overview.currentAcademicYear
              ? ` — showing the current academic session (${overview.currentAcademicYear})`
              : ""}
          </p>
          <ProgressOverviewTable
            students={overview.students}
            hasActiveFilters={hasActiveAcademicProgressFilters(filters, overview.currentAcademicYear)}
          />
          {overview.count > 0 && (
            <ManagementPagination
              page={overview.page}
              totalPages={totalPages}
              buildHref={(p) => buildAcademicProgressHref(filters, p)}
            />
          )}
        </div>
      )}
    </div>
  );
}
