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
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Day</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Time</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Room</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {WEEKDAY_LABELS[entry.day_of_week]}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {entry.start_time}–{entry.end_time}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {entry.course_offering.course.code} — {entry.course_offering.course.name}
                <span className="text-zinc-500 dark:text-zinc-400"> ({entry.course_offering.section})</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {entry.course_offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {entry.room ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
