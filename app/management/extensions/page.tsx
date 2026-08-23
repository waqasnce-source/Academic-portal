import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getExtensionApplications,
  hasActiveExtensionFilters,
  parseExtensionFilters,
  buildExtensionsHref,
  EXTENSIONS_PAGE_SIZE,
} from "@/lib/management/extensions";
import { ExtensionFiltersForm } from "./_components/extension-filters-form";
import { ExtensionsTable } from "./_components/extensions-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementExtensionsPage(
  props: PageProps<"/management/extensions">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseExtensionFilters(rawSearchParams);

  const { data: extensions, count, page, error } = await getExtensionApplications(filters);
  const totalPages = Math.max(1, Math.ceil(count / EXTENSIONS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Extension Applications
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error ? "—" : `${count.toLocaleString()} application${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/extensions/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Record Application
        </Link>
      </div>

      <ExtensionFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <ExtensionsTable extensions={extensions} hasActiveFilters={hasActiveExtensionFilters(filters)} />
          {count > 0 && (
            <ManagementPagination page={page} totalPages={totalPages} buildHref={(p) => buildExtensionsHref(filters, p)} />
          )}
        </>
      )}
    </div>
  );
}
