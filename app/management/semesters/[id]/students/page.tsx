import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getSemesterStudentsOverview } from "@/lib/management/academic-sessions";
import { UUID_RE } from "@/lib/management/query-params";
import { SemesterStudentsTable } from "../../_components/semester-students-table";
import { SemesterTabs } from "../../_components/semester-tabs";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";

export default async function SemesterStudentsPage(props: PageProps<"/management/semesters/[id]/students">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const overview = await getSemesterStudentsOverview(id);
  if (!overview) notFound();

  const semesterLabel = `${overview.semesterName} Semester ${overview.academicYear}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Academic Sessions", href: "/management/academic-sessions" },
            { label: overview.academicYear, href: `/management/academic-sessions/${encodeURIComponent(overview.academicYear)}` },
            { label: `${overview.semesterName} Semester`, href: `/management/semesters/${id}` },
            { label: "Students" },
          ]}
        />
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Students — {semesterLabel}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {overview.students.length} distinct student{overview.students.length === 1 ? "" : "s"} enrolled this
          semester, one row per student with their courses and current degree-level academic progress.
        </p>
      </div>

      <SemesterTabs semesterId={id} active="students" />

      <SemesterStudentsTable students={overview.students} semesterId={id} semesterLabel={semesterLabel} />
    </div>
  );
}
