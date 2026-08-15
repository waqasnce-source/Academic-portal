import { requireRole } from "@/lib/supabase/dal";
import {
  getUsers,
  hasActiveUserFilters,
  parseUserFilters,
  buildUsersHref,
  USERS_PAGE_SIZE,
} from "@/lib/management/users";
import { UserFiltersForm } from "./_components/user-filters-form";
import { UsersTable } from "./_components/users-table";
import { ManagementPagination } from "@/app/management/_components/pagination";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementUsersPage(
  props: PageProps<"/management/users">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseUserFilters(rawSearchParams);

  const { data: users, count, page, error } = await getUsers(filters);
  const totalPages = Math.max(1, Math.ceil(count / USERS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          User &amp; Role Management
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {error
            ? "—"
            : `${count.toLocaleString()} user${count === 1 ? "" : "s"} found`}
        </p>
      </div>

      <UserFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <UsersTable users={users} hasActiveFilters={hasActiveUserFilters(filters)} />
          {count > 0 && (
            <ManagementPagination
              page={page}
              totalPages={totalPages}
              buildHref={(p) => buildUsersHref(filters, p)}
            />
          )}
        </>
      )}
    </div>
  );
}
