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
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Section</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Capacity</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Enrolled</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {offerings.map((offering) => (
            <tr key={offering.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {offering.course.code} — {offering.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {offering.semester.academic_year} — {offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {offering.section}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                {offering.capacity ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {offering.facultyNames.length > 0 ? offering.facultyNames.join(", ") : "TBA"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                {offering.enrollmentCount.toLocaleString()}
                {offering.capacity != null ? ` / ${offering.capacity}` : ""}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={offering.status} tone={STATUS_TONES[offering.status]} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/course-offerings/${offering.id}`}
                  className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
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
