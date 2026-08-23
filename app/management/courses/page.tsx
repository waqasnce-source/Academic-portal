import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getCourses,
  getCourseFilterOptions,
  hasActiveCourseFilters,
  parseCourseFilters,
  COURSES_PAGE_SIZE,
} from "@/lib/management/courses";
import { CourseFiltersForm } from "./_components/course-filters-form";
import { CoursesTable } from "./_components/courses-table";
import { CoursesPagination } from "./_components/courses-pagination";

export default async function ManagementCoursesPage(
  props: PageProps<"/management/courses">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseCourseFilters(rawSearchParams);

  const [{ data: courses, count, page, error }, filterOptions] = await Promise.all([
    getCourses(filters),
    getCourseFilterOptions(),
  ]);

  // getCourses() already clamped an out-of-range `page` to the last valid
  // page before querying, so `page` here is always safe to render.
  const totalPages = Math.max(1, Math.ceil(count / COURSES_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Course Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} course${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/courses/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Course
        </Link>
      </div>

      <CourseFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <CoursesTable
            courses={courses}
            hasActiveFilters={hasActiveCourseFilters(filters)}
          />
          {count > 0 && (
            <CoursesPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
