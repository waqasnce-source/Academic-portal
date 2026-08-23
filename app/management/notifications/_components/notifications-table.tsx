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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Recipient</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Sent</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {notifications.map((notification) => (
            <tr key={notification.id}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="font-medium text-slate-900 dark:text-slate-50">
                  {notification.profile.full_name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {notification.profile.email}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <div className="text-slate-700 dark:text-slate-300">{notification.title}</div>
                <div className="max-w-[320px] truncate text-xs text-slate-500 dark:text-slate-400">
                  {notification.message}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
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
