import Link from "next/link";
import type { CurriculumRequirementRow } from "@/lib/management/curriculum-requirements";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";
import { deleteCurriculumRequirementAction } from "../actions";

export function CurriculumRequirementsTable({
  requirements,
  hasActiveFilters,
}: {
  requirements: CurriculumRequirementRow[];
  hasActiveFilters: boolean;
}) {
  if (requirements.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="curriculum requirements"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/curriculum-requirements"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Program</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Specialization</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Category</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Requirement</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Mandatory</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {requirements.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {r.program.code}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {r.specialization?.name ?? "All specializations"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300 capitalize">
                {r.requirement_category.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {r.course ? (
                  <span className="inline-flex items-center gap-2">
                    <StatusBadge label="Specific course" tone="info" />
                    <span>
                      {r.course.code} ({r.course.credit_hours} CH)
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <StatusBadge label="Category target" tone="neutral" />
                    <span>{r.required_credit_hours ?? "—"} CH</span>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {r.recommended_semester ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge
                  label={r.is_mandatory ? "Mandatory" : "Optional"}
                  tone={r.is_mandatory ? "success" : "neutral"}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/curriculum-requirements/${r.id}`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form action={deleteCurriculumRequirementAction.bind(null, r.id)}>
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Delete
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
