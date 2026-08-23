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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Name</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Email</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Phone</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Role</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {user.full_name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
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
