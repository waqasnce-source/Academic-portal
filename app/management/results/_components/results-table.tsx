import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge } from "@/app/management/_components/status-badge";
import type { ResultRow } from "@/lib/management/results";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResultsTable({
  results,
  hasActiveFilters,
}: {
  results: ResultRow[];
  hasActiveFilters: boolean;
}) {
  if (results.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="results"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/results"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Marks</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Grade</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Grade Pt</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Publication</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {results.map((result) => (
            <tr key={result.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {result.enrollment.student.profile?.full_name ?? result.enrollment.student.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {result.enrollment.course_offering.course.code} — {result.enrollment.course_offering.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {result.enrollment.course_offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {result.marks ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {result.grade ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {result.grade_point ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {result.published_at ? (
                  <StatusBadge label={`Published ${formatDate(result.published_at)}`} tone="success" />
                ) : (
                  <StatusBadge label="Unpublished" tone="neutral" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
