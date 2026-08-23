import Link from "next/link";
import type { StudentProgressSummaryRow } from "@/lib/management/academic-progress";
import { EmptyState } from "@/app/management/_components/empty-state";
import { StudentStatusBadge } from "@/app/_components/academic-status";
import { StatusBadge } from "@/app/management/_components/status-badge";

const DEGREE_LEVEL_LABELS: Record<string, string> = { master: "MS/M.Phil.", phd: "Ph.D." };

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function ProgressOverviewTable({
  students,
  hasActiveFilters,
}: {
  students: StudentProgressSummaryRow[];
  hasActiveFilters: boolean;
}) {
  if (students.length === 0) {
    return <EmptyState entityLabelPlural="students" hasActiveFilters={hasActiveFilters} clearHref="/management/academic-progress" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Discipline</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Supervisor</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Current Stage</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Milestones</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Overall Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {students.map((s) => (
            <tr key={s.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/60">
              <td className="whitespace-nowrap px-4 py-2.5">
                <Link href={`/management/academic-progress/${s.id}`} className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {initialsOf(s.full_name) || "?"}
                  </span>
                  <span>
                    <span className="block font-medium text-slate-900 group-hover:underline dark:text-slate-50">{s.full_name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{s.student_number}</span>
                  </span>
                </Link>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={DEGREE_LEVEL_LABELS[s.degree_level] ?? s.degree_level} tone="neutral" />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{s.department_name}</td>
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.program_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{s.supervisorName ?? "Not assigned"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.currentStage ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">
                {s.totalRequiredCount > 0 ? `${s.completedCount} / ${s.totalRequiredCount}` : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {s.statusLabel ? <StudentStatusBadge statusLabel={s.statusLabel} /> : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/academic-progress/${s.id}`}
                  className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
