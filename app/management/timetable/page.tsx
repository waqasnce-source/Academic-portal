import { requireRole } from "@/lib/supabase/dal";
import {
  getTimetables,
  hasActiveTimetableFilters,
  parseTimetableFilters,
  buildTimetablesHref,
  TIMETABLES_PAGE_SIZE,
} from "@/lib/management/timetables";
import { TimetableFiltersForm } from "./_components/timetable-filters-form";
import { TimetableTable } from "./_components/timetable-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementTimetablePage(
  props: PageProps<"/management/timetable">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseTimetableFilters(rawSearchParams);

  const { data: entries, count, page, error } = await getTimetables(filters);
  const totalPages = Math.max(1, Math.ceil(count / TIMETABLES_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Timetable
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error
            ? "—"
            : `${count.toLocaleString()} ${count === 1 ? "entry" : "entries"} found`}
        </p>
      </div>

      <TimetableFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <TimetableTable entries={entries} hasActiveFilters={hasActiveTimetableFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildTimetablesHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
