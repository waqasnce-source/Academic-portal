import Link from "next/link";
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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Offerings Taught</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Total Credit Hours</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {rows.map((row) => (
            <tr key={row.facultyId}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {row.fullName}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                {row.offeringCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                {row.totalCreditHours.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/faculty/${row.facultyId}`}
                  className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
