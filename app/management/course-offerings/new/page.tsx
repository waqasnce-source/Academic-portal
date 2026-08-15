import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getCourseOptions } from "@/lib/management/courses";
import { getCourseOfferingFilterOptions } from "@/lib/management/course-offerings";
import { CourseOfferingForm } from "../_components/course-offering-form";
import { createCourseOfferingAction } from "../actions";

export default async function NewCourseOfferingPage() {
  await requireRole("management");

  const [courses, { semesters }] = await Promise.all([getCourseOptions(), getCourseOfferingFilterOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/course-offerings"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Course Offerings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Add Course Offering</h1>
      </div>
      <CourseOfferingForm action={createCourseOfferingAction} options={{ courses, semesters }} submitLabel="Create Offering" />
    </div>
  );
}
