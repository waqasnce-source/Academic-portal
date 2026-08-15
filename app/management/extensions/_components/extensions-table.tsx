import Link from "next/link";
import type { ExtensionApplicationRow } from "@/lib/management/extensions";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  rejected: "danger",
  under_review: "info",
  submitted: "info",
  draft: "neutral",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function ExtensionsTable({
  extensions,
  hasActiveFilters,
}: {
  extensions: ExtensionApplicationRow[];
  hasActiveFilters: boolean;
}) {
  if (extensions.length === 0) {
    return <EmptyState entityLabelPlural="extension applications" hasActiveFilters={hasActiveFilters} clearHref="/management/extensions" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Applied</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Requested Period</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Semesters</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {extensions.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {e.student.profile?.full_name ?? e.student.student_number}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">{formatDate(e.application_date)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(e.requested_from)} – {formatDate(e.requested_to)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {e.requested_extension_semesters ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={e.status.replace(/_/g, " ")} tone={STATUS_TONE[e.status] ?? "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/extensions/${e.id}`}
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
