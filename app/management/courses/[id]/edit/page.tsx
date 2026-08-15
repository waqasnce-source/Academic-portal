import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseById, getCourseFilterOptions } from "@/lib/management/courses";
import { UUID_RE } from "@/lib/management/query-params";
import { CourseForm } from "../../_components/course-form";
import { updateCourseAction } from "../../actions";

export default async function EditCoursePage(
  props: PageProps<"/management/courses/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [course, { departments }] = await Promise.all([
    getCourseById(id),
    getCourseFilterOptions(),
  ]);
  if (!course) notFound();

  const action = updateCourseAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/courses"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Course
        </h1>
      </div>
      <CourseForm
        action={action}
        departments={departments}
        defaultValues={course}
        submitLabel="Save changes"
      />
    </div>
  );
}
