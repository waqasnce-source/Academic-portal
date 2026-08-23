import { EmptyState } from "@/app/management/_components/empty-state";
import { WEEKDAY_LABELS, type TimetableRow } from "@/lib/management/timetables";

export function TimetableTable({
  entries,
  hasActiveFilters,
}: {
  entries: TimetableRow[];
  hasActiveFilters: boolean;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="timetable entries"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/timetable"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Day</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Time</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Room</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {WEEKDAY_LABELS[entry.day_of_week]}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {entry.start_time}–{entry.end_time}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {entry.course_offering.course.code} — {entry.course_offering.course.name}
                <span className="text-slate-500 dark:text-slate-400"> ({entry.course_offering.section})</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {entry.course_offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {entry.room ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
