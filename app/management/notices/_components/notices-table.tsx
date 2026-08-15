import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge } from "@/app/management/_components/status-badge";
import type { NoticeRow } from "@/lib/management/notices";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function NoticesTable({
  notices,
  hasActiveFilters,
}: {
  notices: NoticeRow[];
  hasActiveFilters: boolean;
}) {
  if (notices.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="notices"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/notices"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Audience</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Published By</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Published</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Expires</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {notices.map((notice) => (
            <tr key={notice.id}>
              <td className="px-4 py-2.5">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">{notice.title}</div>
                <div className="max-w-[320px] truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {notice.content}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={notice.audience} tone="info" />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {notice.publisher?.full_name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(notice.published_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {notice.expires_at ? formatDate(notice.expires_at) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
