import Link from "next/link";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { type NotificationFilters } from "@/lib/management/notifications";

export function NotificationFiltersForm({ filters }: { filters: NotificationFilters }) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by title or message
        </label>
        <input id="q" name="q" type="text" defaultValue={filters.q} className={fieldClasses} />
      </div>

      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="read" className={labelClasses}>
          Read status
        </label>
        <select id="read" name="read" defaultValue={filters.read} className={fieldClasses}>
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply
        </button>
        <Link
          href="/management/notifications"
          className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
