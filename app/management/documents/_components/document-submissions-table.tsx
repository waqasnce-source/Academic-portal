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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Document</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Version</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Submitted</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {submissions.map((s) => (
            <tr key={s.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {s.student.profile?.full_name ?? s.student.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">{s.requirement.document_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">v{s.version}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{formatDate(s.submitted_at)}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={s.status.replace(/_/g, " ")} tone={STATUS_TONE[s.status] ?? "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/documents/${s.id}`}
                  className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
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
