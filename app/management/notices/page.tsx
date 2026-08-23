import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getNotices,
  hasActiveNoticeFilters,
  parseNoticeFilters,
  buildNoticesHref,
  NOTICES_PAGE_SIZE,
} from "@/lib/management/notices";
import { NoticeFiltersForm } from "./_components/notice-filters-form";
import { NoticesTable } from "./_components/notices-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementNoticesPage(
  props: PageProps<"/management/notices">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseNoticeFilters(rawSearchParams);

  const { data: notices, count, page, error } = await getNotices(filters);
  const totalPages = Math.max(1, Math.ceil(count / NOTICES_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Notices
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error
            ? "—"
            : `${count.toLocaleString()} notice${count === 1 ? "" : "s"} found`}
        </p>
        <Link href="/management/notifications" className="text-sm text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
          System Notifications →
        </Link>
      </div>

      <NoticeFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <NoticesTable notices={notices} hasActiveFilters={hasActiveNoticeFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildNoticesHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
