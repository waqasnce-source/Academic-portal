import { EmptyState } from "@/app/management/_components/empty-state";
import type { AttendanceRateRow } from "@/lib/management/reports/attendance-rate";

function rateTone(percent: number | null): string {
  if (percent === null) return "text-zinc-500 dark:text-zinc-400";
  if (percent >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (percent >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function AttendanceRateTable({
  rows,
  hasActiveFilters,
}: {
  rows: AttendanceRateRow[];
  hasActiveFilters: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="course offerings with recorded attendance"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/reports/attendance-rate"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Sessions</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Present</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Absent</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Late</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Excused</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">% Present</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.courseOfferingId}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {row.course.code} — {row.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {row.semester.academic_year} — {row.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.sessionCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.present.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.absent.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.late.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.excused.toLocaleString()}
              </td>
              <td className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${rateTone(row.presentPercent)}`}>
                {row.presentPercent === null ? "—" : `${row.presentPercent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
