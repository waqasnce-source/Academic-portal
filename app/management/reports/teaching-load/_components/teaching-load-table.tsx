import { EmptyState } from "@/app/management/_components/empty-state";
import type { TeachingLoadRow } from "@/lib/management/reports/teaching-load";

export function TeachingLoadTable({
  rows,
  hasActiveFilters,
}: {
  rows: TeachingLoadRow[];
  hasActiveFilters: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="faculty teaching assignments"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/reports/teaching-load"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Offerings Taught</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Total Credit Hours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={row.facultyId}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {row.fullName}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                {row.offeringCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-700 dark:text-zinc-300">
                {row.totalCreditHours.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
