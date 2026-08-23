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
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No academic record found</p>
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">My Courses</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Coursework enrollment history</p>
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
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {title} ({enrollments.length})
      </h2>
      {enrollments.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">CH</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Semester</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Marks / Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {enrollments.map((e) => (
                <tr key={e.enrollmentId}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                    {e.course.code} — {e.course.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                    {e.course.credit_hours}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                    {formatAcademicDate(e.semesterStartDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <StatusBadge label={e.status.replace(/_/g, " ")} tone={e.status === "completed" ? "success" : "info"} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
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
