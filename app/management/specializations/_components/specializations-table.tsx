import Link from "next/link";
import type { SpecializationRow } from "@/lib/management/specializations";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";
import { toggleSpecializationActiveAction } from "../actions";

export function SpecializationsTable({
  specializations,
  hasActiveFilters,
}: {
  specializations: SpecializationRow[];
  hasActiveFilters: boolean;
}) {
  if (specializations.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="specializations"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/specializations"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Name
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Code
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Department
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Students
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
          {specializations.map((s) => (
            <tr key={s.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {s.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {s.code ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {s.department.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {s.studentCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={s.is_active ? "active" : "inactive"} tone={s.is_active ? "success" : "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/specializations/${s.id}/edit`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form action={toggleSpecializationActiveAction.bind(null, s.id, !s.is_active)}>
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      {s.is_active ? "Deactivate" : "Activate"}
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
