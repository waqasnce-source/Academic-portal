import Link from "next/link";
import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { EnrollmentRow, EnrollmentStatus } from "@/lib/management/enrollments";

const STATUS_TONES: Record<EnrollmentStatus, BadgeTone> = {
  active: "success",
  completed: "info",
  dropped: "warning",
  failed: "danger",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EnrollmentsTable({
  enrollments,
  hasActiveFilters,
}: {
  enrollments: EnrollmentRow[];
  hasActiveFilters: boolean;
}) {
  if (enrollments.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="enrollments"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/enrollments"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Enrolled</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {enrollments.map((enrollment) => (
            <tr key={enrollment.id}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="font-medium text-zinc-900 dark:text-zinc-50">
                  {enrollment.student.profile?.full_name ?? enrollment.student.name}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {enrollment.student.student_number}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {enrollment.course_offering.course.code} — {enrollment.course_offering.course.name}
                <span className="text-zinc-500 dark:text-zinc-400"> ({enrollment.course_offering.section})</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {enrollment.course_offering.semester.academic_year} — {enrollment.course_offering.semester.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatDate(enrollment.enrolled_at)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={enrollment.status} tone={STATUS_TONES[enrollment.status]} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/enrollments/${enrollment.id}`}
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
