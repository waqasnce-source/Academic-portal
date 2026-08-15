import { requireRole } from "@/lib/supabase/dal";
import {
  getNotifications,
  hasActiveNotificationFilters,
  parseNotificationFilters,
  buildNotificationsHref,
  NOTIFICATIONS_PAGE_SIZE,
} from "@/lib/management/notifications";
import { NotificationFiltersForm } from "./_components/notification-filters-form";
import { NotificationsTable } from "./_components/notifications-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementNotificationsPage(
  props: PageProps<"/management/notifications">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseNotificationFilters(rawSearchParams);

  const { data: notifications, count, page, error } = await getNotifications(filters);
  const totalPages = Math.max(1, Math.ceil(count / NOTIFICATIONS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {error
            ? "—"
            : `${count.toLocaleString()} notification${count === 1 ? "" : "s"} found`}
        </p>
      </div>

      <NotificationFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <NotificationsTable
            notifications={notifications}
            hasActiveFilters={hasActiveNotificationFilters(filters)}
          />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildNotificationsHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
