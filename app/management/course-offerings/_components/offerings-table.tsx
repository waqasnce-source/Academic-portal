import Link from "next/link";
import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { CourseOfferingRow, OfferingStatus } from "@/lib/management/course-offerings";

const STATUS_TONES: Record<OfferingStatus, BadgeTone> = {
  planned: "info",
  open: "success",
  closed: "neutral",
  cancelled: "danger",
};

export function OfferingsTable({
  offerings,
  hasActiveFilters,
}: {
  offerings: CourseOfferingRow[];
  hasActiveFilters: boolean;
}) {
  if (offerings.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="course offerings"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/course-offerings"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Section</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Capacity</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Enrolled</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {offerings.map((offering) => (
            <tr key={offering.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {offering.course.code} — {offering.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {offering.semester.academic_year} — {offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {offering.section}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {offering.capacity ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {offering.facultyNames.length > 0 ? offering.facultyNames.join(", ") : "TBA"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {offering.enrollmentCount.toLocaleString()}
                {offering.capacity != null ? ` / ${offering.capacity}` : ""}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={offering.status} tone={STATUS_TONES[offering.status]} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/course-offerings/${offering.id}`}
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
