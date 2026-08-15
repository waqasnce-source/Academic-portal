import { EmptyState } from "@/app/management/_components/empty-state";
import type { CapacityRow } from "@/lib/management/reports/enrollment-capacity";

function utilizationTone(percent: number | null): string {
  if (percent === null) return "text-zinc-500 dark:text-zinc-400";
  if (percent >= 100) return "text-red-600 dark:text-red-400";
  if (percent >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export function CapacityTable({
  rows,
  statusLabel,
  hasActiveFilters,
}: {
  rows: CapacityRow[];
  statusLabel: string;
  hasActiveFilters: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="course offerings"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/reports/enrollment-capacity"
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
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Section</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Capacity</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">{statusLabel}</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {row.course.code} — {row.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {row.semester.academic_year} — {row.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{row.section}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {row.capacity ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                {row.enrolledCount.toLocaleString()}
              </td>
              <td className={`whitespace-nowrap px-4 py-2.5 text-right font-medium ${utilizationTone(row.utilizationPercent)}`}>
                {row.utilizationPercent === null ? "—" : `${row.utilizationPercent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
