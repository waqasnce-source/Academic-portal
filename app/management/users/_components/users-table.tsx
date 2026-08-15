import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { UserRow, ProfileStatus } from "@/lib/management/users";

const STATUS_TONES: Record<ProfileStatus, BadgeTone> = {
  active: "success",
  inactive: "neutral",
  suspended: "danger",
};

export function UsersTable({
  users,
  hasActiveFilters,
}: {
  users: UserRow[];
  hasActiveFilters: boolean;
}) {
  if (users.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="users"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/users"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Name</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Email</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Phone</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Role</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {user.full_name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {user.phone ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={user.role} tone="info" />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={user.status} tone={STATUS_TONES[user.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
