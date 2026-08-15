import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseOptions } from "@/lib/management/courses";
import {
  getCourseOfferingById,
  getCourseOfferingFilterOptions,
  getCourseOfferingFacultyAssignments,
} from "@/lib/management/course-offerings";
import { getFacultyOptions } from "@/lib/management/research-proposals";
import { UUID_RE } from "@/lib/management/query-params";
import { CourseOfferingForm } from "../_components/course-offering-form";
import { FacultyAssignmentPanel } from "../_components/faculty-assignment-panel";
import { updateCourseOfferingAction } from "../actions";

export default async function EditCourseOfferingPage(props: PageProps<"/management/course-offerings/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const offering = await getCourseOfferingById(id);
  if (!offering) notFound();

  const [courses, { semesters }, assignments, faculty] = await Promise.all([
    getCourseOptions(),
    getCourseOfferingFilterOptions(),
    getCourseOfferingFacultyAssignments(id),
    getFacultyOptions(),
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
      <div>
        <Link
          href="/management/course-offerings"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Course Offerings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {offering.course.code} — {offering.course.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {offering.semester.academic_year} — {offering.semester.name} · Section {offering.section}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Offering Details</h2>
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
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Assigned Faculty</h2>
        <FacultyAssignmentPanel offeringId={offering.id} assignments={assignments} facultyOptions={faculty} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Enrollment</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          To enroll a student in this offering, go to{" "}
          <Link href="/management/enrollments/new" className="underline hover:text-zinc-900 dark:hover:text-zinc-50">
            Enrollments → Add Enrollment
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
