import Link from "next/link";
import type { StudentProgressSummaryRow } from "@/lib/management/academic-progress";
import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge } from "@/app/management/_components/status-badge";

const TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  ON_TRACK: "success",
  DUE_SOON: "warning",
  DELAYED: "danger",
  EXTENDED: "info",
  COMPLETED: "success",
  ON_HOLD: "warning",
};

export function ProgressOverviewTable({ students }: { students: StudentProgressSummaryRow[] }) {
  if (students.length === 0) {
    return <EmptyState entityLabelPlural="students" hasActiveFilters={false} clearHref="/management/academic-progress" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Program</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Current Stage</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Progress</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Overdue</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {students.map((s) => (
            <tr key={s.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                <Link href={`/management/students?q=${encodeURIComponent(s.student_number)}`} className="hover:underline">
                  {s.full_name}
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{s.program_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{s.currentStage ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {s.progressPercentage != null ? `${s.progressPercentage}%` : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">{s.overdueCount}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {s.statusLabel ? (
                  <StatusBadge label={s.statusLabel.replace(/_/g, " ")} tone={TONE[s.statusLabel] ?? "neutral"} />
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
