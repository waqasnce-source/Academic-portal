import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import { getFacultyOfferings } from "@/lib/academic/faculty-courses";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

const STATUS_TONE: Record<string, "success" | "info" | "neutral" | "danger"> = {
  open: "success",
  planned: "info",
  closed: "neutral",
  cancelled: "danger",
};

export default async function FacultyCoursesPage() {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) notFound();

  const offerings = await getFacultyOfferings(facultyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My Courses</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {offerings.length} course offering{offerings.length === 1 ? "" : "s"} assigned to you
        </p>
      </div>

      {offerings.length === 0 ? (
        <EmptyState entityLabelPlural="course offerings" hasActiveFilters={false} clearHref="/faculty/courses" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Section</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Your Role</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Enrolled</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Sessions</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Published Grades</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {offerings.map((o) => (
                <tr key={o.id}>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <Link
                      href={`/faculty/courses/${o.id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {o.course.code} — {o.course.name}
                    </Link>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{o.course.credit_hours} CH</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {o.semester.academic_year} — {o.semester.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">{o.section}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300 capitalize">
                    {o.role.replace(/_/g, " ")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                    {o.enrollmentCount}
                    {o.capacity != null ? ` / ${o.capacity}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                    {o.sessionCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                    {o.resultsPublishedCount} / {o.enrollmentCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StatusBadge label={o.status} tone={STATUS_TONE[o.status] ?? "neutral"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
