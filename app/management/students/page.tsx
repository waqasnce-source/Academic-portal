import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getStudentFilterOptions,
  getStudents,
  hasActiveStudentFilters,
  parseStudentFilters,
  STUDENTS_PAGE_SIZE,
} from "@/lib/management/students";
import { StudentFiltersForm } from "./_components/student-filters-form";
import { StudentsTable } from "./_components/students-table";
import { StudentsPagination } from "./_components/students-pagination";

export default async function ManagementStudentsPage(
  props: PageProps<"/management/students">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseStudentFilters(rawSearchParams);

  const [{ data: students, count, page, error }, filterOptions] = await Promise.all([
    getStudents(filters),
    getStudentFilterOptions(),
  ]);

  // getStudents() already clamped an out-of-range `page` (e.g. a stale
  // bookmark) to the last valid page before querying, so `page` here is
  // always safe to render — no separate "invalid page" branch needed.
  const totalPages = Math.max(1, Math.ceil(count / STUDENTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            Student Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error
              ? "—"
              : `${count.toLocaleString()} student${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/students/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Add Student
        </Link>
      </div>

      <StudentFiltersForm filters={filters} options={filterOptions} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <StudentsTable
            students={students}
            hasActiveFilters={hasActiveStudentFilters(filters)}
          />
          {count > 0 && (
            <StudentsPagination filters={filters} page={page} totalPages={totalPages} />
          )}
        </>
      )}
    </div>
  );
}
