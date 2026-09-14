import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getSemesterDetail } from "@/lib/management/academic-sessions";
import { UUID_RE } from "@/lib/management/query-params";
import { SemesterCourseExplorer } from "../_components/semester-course-explorer";
import { SemesterTabs } from "../_components/semester-tabs";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";

export default async function SemesterDetailPage(props: PageProps<"/management/semesters/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const detail = await getSemesterDetail(id);
  if (!detail) notFound();

  const isCurrent = detail.semester.status === "ongoing";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Academic Sessions", href: "/management/academic-sessions" },
            { label: detail.academicYear, href: `/management/academic-sessions/${encodeURIComponent(detail.academicYear)}` },
            { label: detail.semester.name },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {detail.semester.name} {detail.academicYear}
            </h1>
            {isCurrent && (
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-medium text-brand-950 dark:bg-gold-400">
                Current
              </span>
            )}
          </div>
          <Link
            href={`/management/semesters/${id}/edit`}
            className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Edit Semester
          </Link>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {new Date(detail.semester.startDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          {" – "}
          {new Date(detail.semester.endDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <SemesterTabs semesterId={id} active="courses" />

      <div className="flex flex-wrap gap-2">
        <Link
          href="/management/course-offerings/new"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          + Add Course Offering
        </Link>
        <Link
          href="/management/students/new"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          + Add Student
        </Link>
        <Link
          href="/management/bulk-import"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Import Data
        </Link>
      </div>

      {detail.disciplines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No course offerings yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Offerings created for this semester will appear here, grouped by discipline.
          </p>
          <Link
            href="/management/course-offerings/new"
            className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Add a course offering
          </Link>
        </div>
      ) : (
        <SemesterCourseExplorer disciplines={detail.disciplines} />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Courses" value={detail.semester.offeringCount} />
        <Stat label="Credit Hours" value={detail.semester.totalCreditHours} />
        <Stat label="Faculty" value={detail.semester.facultyCount} />
        <Stat label="Students" value={detail.semester.studentCount} />
        <Stat label="MS/M.Phil. Courses" value={detail.msPhilCourseCount} />
        <Stat label="Ph.D. Courses" value={detail.phdCourseCount} />
      </div>
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
