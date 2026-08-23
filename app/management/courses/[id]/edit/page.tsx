import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseById, getCourseFilterOptions, getCourseOfferingCount } from "@/lib/management/courses";
import { UUID_RE } from "@/lib/management/query-params";
import { CourseForm } from "../../_components/course-form";
import { updateCourseAction } from "../../actions";

export default async function EditCoursePage(
  props: PageProps<"/management/courses/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [course, { departments }, offeringCount] = await Promise.all([
    getCourseById(id),
    getCourseFilterOptions(),
    getCourseOfferingCount(id),
  ]);
  if (!course) notFound();

  const action = updateCourseAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/courses"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Edit Course
        </h1>
      </div>
      {offeringCount > 0 && (
        <p className="max-w-lg rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          This course has {offeringCount} existing course offering{offeringCount === 1 ? "" : "s"}. Changing its
          code, title, credit hours, or discipline will change how those historical offerings are displayed —
          consider retiring it (Status: Inactive) instead of altering its identity if it&apos;s being replaced.
        </p>
      )}
      <CourseForm
        action={action}
        departments={departments}
        defaultValues={course}
        submitLabel="Save changes"
      />
    </div>
  );
}
