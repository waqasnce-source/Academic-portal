import Link from "next/link";
import type { DepartmentRow, DepartmentStatus } from "@/lib/management/departments";
import { toggleDepartmentStatusAction } from "../actions";

const STATUS_BADGE_CLASSES: Record<DepartmentStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: DepartmentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DepartmentsTable({
  departments,
  hasActiveFilters,
}: {
  departments: DepartmentRow[];
  hasActiveFilters: boolean;
}) {
  if (departments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No departments found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {hasActiveFilters
            ? "No department records match the current filters."
            : "No department records exist yet."}
        </p>
        {hasActiveFilters && (
          <Link
            href="/management/departments"
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
              Code
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Programs
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Faculty
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Courses
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Added
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
          {departments.map((dept) => (
            <tr key={dept.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {dept.code}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {dept.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {dept.programCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {dept.facultyCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {dept.courseCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(dept.created_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={dept.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/departments/${dept.id}/edit`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleDepartmentStatusAction.bind(
                      null,
                      dept.id,
                      dept.status === "active" ? "inactive" : "active"
                    )}
                  >
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      {dept.status === "active" ? "Deactivate" : "Activate"}
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
