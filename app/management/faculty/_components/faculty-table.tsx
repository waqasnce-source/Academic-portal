import Link from "next/link";
import type { FacultyRow, FacultyStatus } from "@/lib/management/faculty";
import { toggleFacultyStatusAction } from "../actions";

const STATUS_BADGE_CLASSES: Record<FacultyStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: FacultyStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function formatJoinedDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FacultyTable({
  faculty,
  hasActiveFilters,
}: {
  faculty: FacultyRow[];
  hasActiveFilters: boolean;
}) {
  if (faculty.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No faculty found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {hasActiveFilters
            ? "No faculty records match the current filters."
            : "No faculty records exist yet."}
        </p>
        {hasActiveFilters && (
          <Link
            href="/management/faculty"
            className="mt-4 inline-block text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Employee #
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Email
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Designation
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Department
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Joined
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Status
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {faculty.map((member) => (
            <tr key={member.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {member.employee_number ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {member.profile?.full_name ?? member.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {member.profile?.email ?? member.email ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {member.designation}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {member.department?.name ?? "Not assigned"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatJoinedDate(member.joined_date)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={member.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/faculty/${member.id}/edit`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleFacultyStatusAction.bind(
                      null,
                      member.id,
                      member.status === "active" ? "inactive" : "active"
                    )}
                  >
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      {member.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
