import Link from "next/link";
import type { CourseRow, CourseStatus } from "@/lib/management/courses";
import { toggleCourseStatusAction } from "../actions";

const STATUS_BADGE_CLASSES: Record<CourseStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  inactive: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

function formatCreditHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  const label = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  return `${label} cr`;
}

export function CoursesTable({
  courses,
  hasActiveFilters,
}: {
  courses: CourseRow[];
  hasActiveFilters: boolean;
}) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No courses found
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {hasActiveFilters
            ? "No course records match the current filters."
            : "No course records exist yet."}
        </p>
        {hasActiveFilters && (
          <Link
            href="/management/courses"
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
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Department
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">
              Credit Hours
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Programs
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">
              Offerings
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
          {courses.map((course) => (
            <tr key={course.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">
                {course.code}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {course.department.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                {formatCreditHours(course.credit_hours)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {course.programCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                {course.offeringCount.toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={course.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/courses/${course.id}/edit`}
                    className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Edit
                  </Link>
                  <form
                    action={toggleCourseStatusAction.bind(
                      null,
                      course.id,
                      course.status === "active" ? "inactive" : "active"
                    )}
                  >
                    <button
                      type="submit"
                      className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      {course.status === "active" ? "Deactivate" : "Activate"}
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
