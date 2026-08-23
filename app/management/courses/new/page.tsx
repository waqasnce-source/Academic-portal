import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseFilterOptions } from "@/lib/management/courses";
import { CourseForm } from "../_components/course-form";
import { createCourseAction } from "../actions";

export default async function NewCoursePage() {
  await requireRole("management");

  const { departments } = await getCourseFilterOptions();

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
          Add Course
        </h1>
      </div>
      <CourseForm
        action={createCourseAction}
        departments={departments}
        defaultValues={{ department_id: "", code: "", name: "", credit_hours: 3, status: "active" }}
        submitLabel="Create"
      />
    </div>
  );
}
