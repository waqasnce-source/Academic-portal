import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseOptions } from "@/lib/management/courses";
import {
  getCourseOfferingById,
  getCourseOfferingFilterOptions,
  getCourseOfferingFacultyAssignments,
  getOfferingRoster,
} from "@/lib/management/course-offerings";
import { getFacultyOptions } from "@/lib/management/research-proposals";
import { UUID_RE } from "@/lib/management/query-params";
import { degreeLevelLabel } from "@/lib/management/academic-sessions";
import { CourseOfferingForm } from "../_components/course-offering-form";
import { FacultyAssignmentPanel } from "../_components/faculty-assignment-panel";
import { OfferingRosterTable } from "../_components/offering-roster-table";
import { BulkEnrollPanel } from "../_components/bulk-enroll-panel";
import { updateCourseOfferingAction } from "../actions";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";

export default async function EditCourseOfferingPage(props: PageProps<"/management/course-offerings/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const offering = await getCourseOfferingById(id);
  if (!offering) notFound();

  const [courses, { semesters }, assignments, faculty, roster] = await Promise.all([
    getCourseOptions(),
    getCourseOfferingFilterOptions(),
    getCourseOfferingFacultyAssignments(id),
    getFacultyOptions(),
    getOfferingRoster(id),
  ]);

  // The offering's own course may since have been deactivated — keep it
  // selectable on this edit form even though new offerings only offer
  // active courses (see actions.ts / the "prevent offering an inactive
  // course" rule), so the pre-filled select doesn't silently lose the
  // current value.
  const courseOptions = courses.some((c) => c.id === offering.course_id)
    ? courses
    : [{ id: offering.course_id, code: offering.course.code, name: offering.course.name, credit_hours: 0 }, ...courses];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Breadcrumb
          items={[
            { label: "Academic Sessions", href: "/management/academic-sessions" },
            { label: offering.semester.academic_year, href: `/management/academic-sessions/${encodeURIComponent(offering.semester.academic_year)}` },
            { label: offering.semester.name, href: `/management/semesters/${offering.semester_id}` },
            { label: offering.course.code },
          ]}
        />
        <Link
          href={`/management/semesters/${offering.semester_id}`}
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Back to {offering.semester.name} {offering.semester.academic_year}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {offering.course.code} — {offering.course.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {offering.semester.academic_year} — {offering.semester.name} · Section {offering.section}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Course Information</h2>
        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 p-4 text-sm sm:grid-cols-4 dark:border-slate-800">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Course No.</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.course.code}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Course Title</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.course.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Discipline</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.discipline.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Degree Level</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{degreeLevelLabel(offering.degreeLevel)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Credit Hours</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.creditHours}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Academic Session</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.semester.academic_year}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Semester</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">{offering.semester.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Offering Status</dt>
            <dd className="font-medium capitalize text-slate-900 dark:text-slate-50">{offering.status}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Offering Details</h2>
        <CourseOfferingForm
          action={updateCourseOfferingAction.bind(null, offering.id)}
          options={{ courses: courseOptions, semesters }}
          defaultValues={{
            course_id: offering.course_id,
            semester_id: offering.semester_id,
            section: offering.section,
            capacity: offering.capacity,
            status: offering.status,
          }}
          submitLabel="Save Changes"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assigned Faculty</h2>
        <FacultyAssignmentPanel offeringId={offering.id} assignments={assignments} facultyOptions={faculty} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Enrolled Students ({roster.length})
          </h2>
          <Link
            href="/management/enrollments/new"
            className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Add Enrollment
          </Link>
        </div>
        <BulkEnrollPanel offeringId={offering.id} />
        <OfferingRosterTable roster={roster} offeringId={offering.id} courseLabel={offering.course.code} />
      </section>
    </div>
  );
}
