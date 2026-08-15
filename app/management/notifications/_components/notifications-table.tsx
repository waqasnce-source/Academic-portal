import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge } from "@/app/management/_components/status-badge";
import type { NotificationRow } from "@/lib/management/notifications";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationsTable({
  notifications,
  hasActiveFilters,
}: {
  notifications: NotificationRow[];
  hasActiveFilters: boolean;
}) {
  if (notifications.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="notifications"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/notifications"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Recipient</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Sent</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {notifications.map((notification) => (
            <tr key={notification.id}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {notification.profile.full_name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {notification.profile.email}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <div className="text-zinc-700 dark:text-zinc-300">{notification.title}</div>
                <div className="max-w-[320px] truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {notification.message}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDateTime(notification.created_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {notification.is_read ? (
                  <StatusBadge label="Read" tone="neutral" />
                ) : (
                  <StatusBadge label="Unread" tone="info" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
