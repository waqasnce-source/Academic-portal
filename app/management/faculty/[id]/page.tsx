import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getFacultyProfile } from "@/lib/management/faculty";
import {
  getFacultyTeachingHistory,
  getAcademicSessionsOverview,
  getCurrentAcademicYear,
  degreeLevelLabel,
} from "@/lib/management/academic-sessions";
import { getSuperviseesWithStatus, type SuperviseeWithStatus } from "@/lib/academic/supervisors";
import type { DegreeLevel } from "@/lib/management/status-enums";
import type { CourseOfferingFacultyRole } from "@/lib/management/status-enums";
import { UUID_RE } from "@/lib/management/query-params";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { StudentStatusBadge } from "@/app/_components/academic-status";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

const OFFERING_STATUS_TONE: Record<string, "success" | "info" | "neutral" | "danger"> = {
  open: "success",
  planned: "info",
  closed: "neutral",
  cancelled: "danger",
};

const ROLE_LABELS: Record<CourseOfferingFacultyRole, string> = {
  primary: "Primary",
  co_instructor: "Co-Instructor",
  lab_instructor: "Lab Instructor",
};

const SUPERVISOR_ROLE_LABELS: Record<string, string> = {
  supervisor: "Primary Supervisor",
  co_supervisor: "Co-Supervisor",
};

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function FacultyHubPage(props: PageProps<"/management/faculty/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [faculty, history, sessionsOverview, activeSupervisees] = await Promise.all([
    getFacultyProfile(id),
    getFacultyTeachingHistory(id),
    getAcademicSessionsOverview(),
    getSuperviseesWithStatus(id),
  ]);
  if (!faculty || !history) notFound();

  const rawSearchParams = await props.searchParams;
  const currentYear = getCurrentAcademicYear(sessionsOverview);
  const requestedYear = firstValue(rawSearchParams.session).trim();
  const availableYears = sessionsOverview.map((s) => s.academicYear).sort((a, b) => b.localeCompare(a));
  const selectedYear = availableYears.includes(requestedYear) ? requestedYear : (currentYear ?? availableYears[0] ?? "");
  const showHistorical = firstValue(rawSearchParams.historical).trim() === "1";

  const selectedSession = history.sessions.find((s) => s.academicYear === selectedYear) ?? null;

  const supervisionRows: SuperviseeWithStatus[] = showHistorical
    ? await getSuperviseesWithStatus(id, true)
    : activeSupervisees;

  const studentsNeedingAttention = activeSupervisees.filter(
    (s) => s.academicStatus?.requiresAdministrativeAction
  ).length;

  const displayName = faculty.profile?.full_name ?? faculty.name;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Breadcrumb items={[{ label: "Faculty", href: "/management/faculty" }, { label: displayName }]} />
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{displayName}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {faculty.designation}
              {faculty.department ? ` · ${faculty.department.name}` : ""}
              {faculty.email || faculty.profile?.email ? ` · ${faculty.profile?.email ?? faculty.email}` : ""}
              {faculty.employee_number ? ` · #${faculty.employee_number}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge label={faculty.status} tone={faculty.status === "active" ? "success" : "neutral"} />
            <Link
              href={`/management/faculty/${id}/edit`}
              className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Edit Faculty Record →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={`Courses — ${selectedYear || "—"}`} value={selectedSession?.totalCourses ?? 0} />
        <Stat label={`Students Taught — ${selectedYear || "—"}`} value={selectedSession?.totalStudents ?? 0} />
        <Stat label="Students Under Supervision" value={activeSupervisees.length} />
        <Stat label="Needing Attention" value={studentsNeedingAttention} tone={studentsNeedingAttention > 0 ? "danger" : undefined} />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Teaching</h2>
          <form method="GET" className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="session" className={labelClasses}>
                Academic Session
              </label>
              <select id="session" name="session" defaultValue={selectedYear} className={fieldClasses}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                    {year === currentYear ? " (current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              View
            </button>
          </form>
        </div>

        {!selectedSession || selectedSession.semesters.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No courses taught in {selectedYear || "this session"}.
          </p>
        ) : (
          <div className="space-y-6">
            {selectedSession.semesters.map((semester) => (
              <div key={semester.semesterId} className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {semester.semesterName} — {semester.courses.length} course{semester.courses.length === 1 ? "" : "s"}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Discipline</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">CH</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Role</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                        <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Students</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {semester.courses.map((course) => (
                        <tr key={course.offeringId}>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <Link
                              href={`/management/course-offerings/${course.offeringId}`}
                              className="font-medium text-slate-900 hover:underline dark:text-slate-50"
                            >
                              {course.code}
                            </Link>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{course.name}</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {course.discipline.name}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {degreeLevelLabel(course.degreeLevel)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                            {course.creditHours}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {course.role ? (ROLE_LABELS[course.role as CourseOfferingFacultyRole] ?? course.role) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            <StatusBadge
                              label={course.offeringStatus}
                              tone={OFFERING_STATUS_TONE[course.offeringStatus] ?? "neutral"}
                            />
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-right">
                            <Link
                              href={`/management/course-offerings/${course.offeringId}`}
                              className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                            >
                              {course.studentCount} student{course.studentCount === 1 ? "" : "s"}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Students Under Supervision ({supervisionRows.length})
          </h2>
          <Link
            href={`/management/faculty/${id}${showHistorical ? "" : "?historical=1"}${
              selectedYear && !showHistorical ? `&session=${encodeURIComponent(selectedYear)}` : ""
            }`}
            className="text-sm text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            {showHistorical ? "Show active supervision only" : "Show historical supervision"}
          </Link>
        </div>

        {supervisionRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No students currently supervised by this faculty member.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Admission</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Stage</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Milestones</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Role</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {supervisionRows.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      <Link
                        href={`/management/academic-progress/${s.student.id}?backHref=${encodeURIComponent(
                          `/management/faculty/${id}`
                        )}&backLabel=${encodeURIComponent(displayName)}`}
                        className="hover:underline"
                      >
                        {s.student.profile?.full_name ?? s.student.name}
                      </Link>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.student.student_number}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {s.student.program?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {degreeLevelLabel((s.student.program?.degree_level as DegreeLevel) ?? null)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {s.student.admission_year}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {s.academicStatus?.currentStage ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {s.academicStatus ? (
                        <>
                          <div>{s.academicStatus.currentMilestone?.title ?? "All milestones complete"}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {s.academicStatus.completedMilestones.length}/{s.academicStatus.requiredMilestones.length} completed
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {SUPERVISOR_ROLE_LABELS[s.role] ?? s.role}
                      {s.status !== "active" && (
                        <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-600">(ended)</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {s.academicStatus ? <StudentStatusBadge statusLabel={s.academicStatus.statusLabel} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-semibold ${tone === "danger" && value > 0 ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-slate-50"}`}>
        {value}
      </p>
    </div>
  );
}
