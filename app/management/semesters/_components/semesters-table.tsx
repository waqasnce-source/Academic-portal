import Link from "next/link";
import type { SemesterRow, SemesterStatus } from "@/lib/management/semesters";

const STATUS_BADGE_CLASSES: Record<SemesterStatus, string> = {
  upcoming: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  ongoing:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  completed: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: SemesterStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SemestersTable({
  semesters,
  hasActiveFilters,
}: {
  semesters: SemesterRow[];
  hasActiveFilters: boolean;
}) {
  if (semesters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No semesters found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {hasActiveFilters
            ? "No semester records match the current filters."
            : "No semester records exist yet."}
        </p>
        {hasActiveFilters && (
          <Link
            href="/management/semesters"
            className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Academic Year
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Start
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              End
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Offerings
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {semesters.map((semester) => (
            <tr key={semester.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {semester.academic_year}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(semester.start_date)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(semester.end_date)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {semester.offeringCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={semester.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/semesters/${semester.id}/edit`}
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
