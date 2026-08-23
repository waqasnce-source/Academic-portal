import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getSemesterOperations, getSemesterDetail } from "@/lib/management/academic-sessions";
import { UUID_RE } from "@/lib/management/query-params";
import { SemesterCourseExplorer } from "../../_components/semester-course-explorer";
import { SemesterTabs } from "../../_components/semester-tabs";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";

type StepState = "complete" | "in-progress" | "needs-attention";

interface WorkflowStep {
  label: string;
  detail: string;
  state: StepState;
}

const STEP_STYLES: Record<StepState, { icon: string; className: string }> = {
  complete: { icon: "✓", className: "text-emerald-600 dark:text-emerald-400" },
  "in-progress": { icon: "◐", className: "text-amber-600 dark:text-amber-400" },
  "needs-attention": { icon: "⚠", className: "text-red-600 dark:text-red-400" },
};

export default async function SemesterOperationsPage(props: PageProps<"/management/semesters/[id]/operations">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [ops, detail] = await Promise.all([getSemesterOperations(id), getSemesterDetail(id)]);
  if (!ops || !detail) notFound();

  const isCurrent = ops.semester.status === "ongoing";
  const importBase = `/management/bulk-import?year=${encodeURIComponent(ops.academicYear)}&semester=${encodeURIComponent(ops.semester.name)}`;

  const steps: WorkflowStep[] = [
    { label: "Semester", detail: `${ops.semester.name} ${ops.academicYear} — dates defined`, state: "complete" },
    {
      label: "Courses",
      detail: `${ops.catalogue.totalActiveCourses} active courses in the catalogue`,
      state: ops.catalogue.totalActiveCourses > 0 ? "complete" : "needs-attention",
    },
    {
      label: "Offerings",
      detail:
        ops.offerings.reportable > 0
          ? `${ops.offerings.reportable} offering${ops.offerings.reportable === 1 ? "" : "s"} open/closed this semester`
          : ops.offerings.total > 0
            ? `${ops.offerings.total} offering${ops.offerings.total === 1 ? "" : "s"} exist, but none are Open/Closed yet`
            : "No course offerings created yet",
      state: ops.offerings.reportable > 0 ? "complete" : ops.offerings.total > 0 ? "in-progress" : "needs-attention",
    },
    {
      label: "Faculty",
      detail:
        ops.offerings.withoutFaculty === 0
          ? "All offerings have faculty assigned"
          : `${ops.offerings.withoutFaculty} offering${ops.offerings.withoutFaculty === 1 ? " still needs" : "s still need"} faculty`,
      state: ops.offerings.total === 0 ? "needs-attention" : ops.offerings.withoutFaculty === 0 ? "complete" : "in-progress",
    },
    {
      label: "Students",
      detail: `${ops.students.totalActiveInstitution} active student record${ops.students.totalActiveInstitution === 1 ? "" : "s"} institution-wide`,
      state: ops.students.totalActiveInstitution > 0 ? "complete" : "needs-attention",
    },
    {
      label: "Enrollment",
      detail: `${ops.students.distinctEnrolled} student${ops.students.distinctEnrolled === 1 ? "" : "s"} enrolled this semester`,
      state: ops.students.distinctEnrolled > 0 ? "complete" : ops.offerings.reportable > 0 ? "in-progress" : "needs-attention",
    },
    {
      label: "Review",
      detail:
        ops.dataQuality.length === 0
          ? "No data-quality issues detected"
          : `${ops.dataQuality.length} item${ops.dataQuality.length === 1 ? "" : "s"} to review`,
      state:
        ops.dataQuality.length === 0
          ? "complete"
          : ops.dataQuality.some((d) => d.severity === "warning")
            ? "needs-attention"
            : "in-progress",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Academic Sessions", href: "/management/academic-sessions" },
            { label: ops.academicYear, href: `/management/academic-sessions/${encodeURIComponent(ops.academicYear)}` },
            { label: ops.semester.name, href: `/management/semesters/${id}` },
            { label: "Operations" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Semester Operations — {ops.semester.name} {ops.academicYear}
          </h1>
          {isCurrent && (
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-medium text-brand-950 dark:bg-gold-400">
              Current
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {new Date(ops.semester.startDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {" – "}
          {new Date(ops.semester.endDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {" · "}
          <span className="capitalize">{ops.semester.status}</span>
        </p>
      </div>

      <SemesterTabs semesterId={id} active="operations" />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <Stat label="Courses Offered" value={ops.catalogue.offeredThisSemester} />
        <Stat label="Total Credit Hours" value={ops.semester.totalCreditHours} />
        <Stat label="Faculty Teaching" value={ops.faculty.distinctTeaching} />
        <Stat label="Students Enrolled" value={ops.students.distinctEnrolled} />
        <Stat label="Course Offerings" value={ops.offerings.reportable} />
        <Stat label="Disciplines" value={detail.disciplines.filter((d) => d.courses.length > 0).length} />
        <Stat label="MS/M.Phil. Courses Offered" value={detail.msPhilCourseCount} />
        <Stat label="Ph.D. Courses Offered" value={detail.phdCourseCount} />
      </div>

      {/* Recommended workflow */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Recommended Workflow</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.label}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
            >
              <span className={`mr-1.5 font-semibold ${STEP_STYLES[step.state].className}`}>{STEP_STYLES[step.state].icon}</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">{step.label}</span>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{step.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WorkflowCard title="Course Catalogue">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Catalogue courses" value={ops.catalogue.totalActiveCourses} />
            <Row label="MS/M.Phil." value={ops.catalogue.msPhilCourses} />
            <Row label="Ph.D." value={ops.catalogue.phdCourses} />
            <Row label="Offered this semester" value={ops.catalogue.offeredThisSemester} />
          </dl>
          <CardActions>
            <ActionLink href="/management/courses">View Catalogue</ActionLink>
            <ActionLink href="/management/courses/new">Add Course</ActionLink>
            <ActionLink href="/management/bulk-import?type=courses">Import Courses</ActionLink>
          </CardActions>
        </WorkflowCard>

        <WorkflowCard title="Course Offerings">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Offerings (reportable)" value={ops.offerings.reportable} />
            <Row label="With faculty assigned" value={ops.offerings.withOneFaculty + ops.offerings.withMultipleFaculty} />
            <Row label="Without faculty" value={ops.offerings.withoutFaculty} warn={ops.offerings.withoutFaculty > 0} />
            <Row label="Planned" value={ops.offerings.planned} />
          </dl>
          {ops.offerings.withoutFaculty > 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
              {ops.offerings.withoutFaculty} offering{ops.offerings.withoutFaculty === 1 ? " still needs" : "s still need"} a faculty member assigned.
            </p>
          )}
          <CardActions>
            <ActionLink href="/management/course-offerings/new">Add Course Offering</ActionLink>
            <ActionLink href={`${importBase}&type=offerings`}>Import Offerings</ActionLink>
            <ActionLink href="/management/course-offerings">View All Offerings</ActionLink>
            <ActionLink href="/management/timetable">Timetable</ActionLink>
          </CardActions>
        </WorkflowCard>

        <WorkflowCard title="Faculty Assignment">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Faculty teaching" value={ops.faculty.distinctTeaching} />
            <Row label="One faculty member" value={ops.offerings.withOneFaculty} />
            <Row label="Multiple faculty" value={ops.offerings.withMultipleFaculty} />
            <Row label="No faculty" value={ops.offerings.withoutFaculty} warn={ops.offerings.withoutFaculty > 0} />
          </dl>
          <CardActions>
            <ActionLink href="/management/course-offerings">Manage Faculty Assignments</ActionLink>
            <ActionLink href="/management/reports/teaching-load">Faculty Teaching</ActionLink>
          </CardActions>
        </WorkflowCard>

        <WorkflowCard title="Students">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <Row label="Active students (institution)" value={ops.students.totalActiveInstitution} />
            <Row label="MS/M.Phil. enrolled" value={ops.students.msPhilEnrolled} />
            <Row label="Ph.D. enrolled" value={ops.students.phdEnrolled} />
            <Row label="No enrollment this semester" value={ops.students.withNoEnrollment} warn={ops.students.withNoEnrollment > 0} />
          </dl>
          <CardActions>
            <ActionLink href="/management/students/new">Add Student</ActionLink>
            <ActionLink href="/management/bulk-import?type=students">Import Students</ActionLink>
            <ActionLink href="/management/students">View Students</ActionLink>
          </CardActions>
        </WorkflowCard>

        <WorkflowCard title="Enrollment" spanFull>
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Row label="Distinct students" value={ops.students.distinctEnrolled} />
            <Row label="In 1 course" value={ops.students.enrolledInOneCourse} />
            <Row label="In 2 courses" value={ops.students.enrolledInTwoCourses} />
            <Row label="In 3+ courses" value={ops.students.enrolledInThreeOrMoreCourses} />
            <Row label="Active" value={ops.enrollments.active} />
            <Row label="Completed" value={ops.enrollments.completed} />
            <Row label="Dropped (excluded from totals)" value={ops.enrollments.dropped} muted />
            <Row label="Failed" value={ops.enrollments.failed} />
          </dl>
          <CardActions>
            <ActionLink href="/management/enrollments/new">Bulk Enroll</ActionLink>
            <ActionLink href={`${importBase}&type=enrollments`}>Import Enrollments</ActionLink>
            <ActionLink href={`/management/semesters/${id}/students`}>Review Enrollments</ActionLink>
          </CardActions>
        </WorkflowCard>
      </div>

      {/* Data quality */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Semester Data Quality</h2>
        {ops.dataQuality.length === 0 ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            No data-quality issues detected for this semester.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {ops.dataQuality.map((issue, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <span className={issue.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"}>
                    {issue.severity === "warning" ? "⚠" : "ℹ"}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">{issue.message}</span>
                </span>
                <Link href={issue.href} className="shrink-0 text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Course matrix */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Semester Course Matrix</h2>
        <SemesterCourseExplorer disciplines={detail.disciplines} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

function Row({ label, value, warn, muted }: { label: string; value: number; warn?: boolean; muted?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={`font-medium ${
          warn
            ? "text-amber-600 dark:text-amber-400"
            : muted
              ? "text-slate-400 dark:text-slate-600"
              : "text-slate-900 dark:text-slate-50"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function WorkflowCard({ title, children, spanFull }: { title: string; children: React.ReactNode; spanFull?: boolean }) {
  return (
    <div className={`space-y-3 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 ${spanFull ? "lg:col-span-2" : ""}`}>
      <h3 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
      {children}
    </div>
  );
}

function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-3 dark:border-slate-800">{children}</div>;
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
      {children}
    </Link>
  );
}
