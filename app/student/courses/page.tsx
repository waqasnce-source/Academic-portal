import { requireRole } from "@/lib/supabase/dal";
import { getCurrentStudentId } from "@/lib/academic/identity";
import { getStudentCourseworkEnrollments, type StudentCourseworkEnrollmentRow } from "@/lib/academic/degree-audit";
import { formatAcademicDate } from "@/app/_components/academic-status";
import { StatusBadge } from "@/app/management/_components/status-badge";

/**
 * Read-only enrollment list, reusing getStudentCourseworkEnrollments()
 * unmodified (lib/academic/degree-audit.ts). `results.published_at`
 * gating for an unpublished result is enforced by RLS on the underlying
 * query (a student session never receives an unpublished result row) —
 * nothing here re-implements that check.
 */
export default async function StudentCoursesPage() {
  const profile = await requireRole("student");
  const studentId = await getCurrentStudentId(profile.id);

  if (!studentId) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No academic record found</p>
      </div>
    );
  }

  const enrollments = await getStudentCourseworkEnrollments(studentId);

  const current = enrollments.filter((e) => e.status === "active");
  const completed = enrollments.filter((e) => e.status === "completed");
  const other = enrollments.filter((e) => e.status !== "active" && e.status !== "completed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">My Courses</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Coursework enrollment history</p>
      </div>

      <CourseGroup title="Current" enrollments={current} emptyText="No current enrollments." />
      <CourseGroup title="Completed" enrollments={completed} emptyText="No completed courses yet." />
      {other.length > 0 && <CourseGroup title="Other" enrollments={other} emptyText="" />}
    </div>
  );
}

function CourseGroup({
  title,
  enrollments,
  emptyText,
}: {
  title: string;
  enrollments: StudentCourseworkEnrollmentRow[];
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {title} ({enrollments.length})
      </h2>
      {enrollments.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Course</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">CH</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Semester</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Marks / Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {enrollments.map((e) => (
                <tr key={e.enrollmentId}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                    {e.course.code} — {e.course.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                    {e.course.credit_hours}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {formatAcademicDate(e.semesterStartDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StatusBadge label={e.status.replace(/_/g, " ")} tone={e.status === "completed" ? "success" : "info"} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                    {e.result
                      ? e.result.published_at
                        ? `${e.result.marks ?? "—"} ${e.result.grade ? `(${e.result.grade})` : ""}`
                        : "Not yet published"
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
