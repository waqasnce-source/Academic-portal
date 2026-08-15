import Link from "next/link";
import type { GradingScaleRow } from "@/lib/management/grading-scale";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";
import { toggleGradingScaleBandStatusAction } from "../actions";

export function GradingScaleTable({ bands }: { bands: GradingScaleRow[] }) {
  if (bands.length === 0) {
    return <EmptyState entityLabelPlural="grading scale bands" hasActiveFilters={false} clearHref="/management/grading-scale" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Letter Grade</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Marks Range</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Grade Point</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Passing</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {bands.map((b) => (
            <tr key={b.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{b.name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{b.letter_grade}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {b.min_marks} – {b.max_marks}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{b.grade_point}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={b.is_passing ? "Pass" : "Fail"} tone={b.is_passing ? "success" : "danger"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={b.status} tone={b.status === "active" ? "success" : "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/grading-scale/${b.id}`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleGradingScaleBandStatusAction.bind(
                      null,
                      b.id,
                      b.status === "active" ? "inactive" : "active"
                    )}
                  >
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      {b.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
