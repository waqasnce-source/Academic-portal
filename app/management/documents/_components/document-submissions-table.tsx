import Link from "next/link";
import type { DocumentSubmissionRow } from "@/lib/management/documents";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  completed: "success",
  approved: "success",
  under_review: "info",
  submitted: "info",
  corrections_required: "warning",
  overdue: "danger",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function DocumentSubmissionsTable({ submissions }: { submissions: DocumentSubmissionRow[] }) {
  if (submissions.length === 0) {
    return <EmptyState entityLabelPlural="document submissions" hasActiveFilters={false} clearHref="/management/documents" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Document</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Version</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Submitted</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {submissions.map((s) => (
            <tr key={s.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {s.student.profile?.full_name ?? s.student.student_number}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{s.requirement.document_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">v{s.version}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{formatDate(s.submitted_at)}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={s.status.replace(/_/g, " ")} tone={STATUS_TONE[s.status] ?? "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/documents/${s.id}`}
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Review
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
