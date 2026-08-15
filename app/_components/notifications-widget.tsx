import type { NotificationRow } from "@/lib/management/notifications";
import { formatAcademicDate } from "@/app/_components/academic-status";
import { markNotificationReadAction } from "@/app/_actions/notifications";

/**
 * Shared dashboard widget for student and faculty portals — same
 * getRecentNotificationsForProfile()/markNotificationReadAction() plumbing,
 * one rendering, so the two never drift.
 */
export function NotificationsWidget({
  notifications,
  revalidatePath,
}: {
  notifications: NotificationRow[];
  revalidatePath: string;
}) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
        </p>
      </div>
      {notifications.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No notifications yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                n.is_read
                  ? "border-zinc-200 dark:border-zinc-800"
                  : "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
              }`}
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.title}</p>
                <p className="text-zinc-600 dark:text-zinc-400">{n.message}</p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{formatAcademicDate(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <form action={markNotificationReadAction.bind(null, revalidatePath, n.id)}>
                  <button
                    type="submit"
                    className="shrink-0 text-xs text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Mark read
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
