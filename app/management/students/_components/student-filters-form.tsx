import Link from "next/link";
import {
  STUDENT_STATUSES,
  type StudentFilters,
  type StudentFilterOptions,
} from "@/lib/management/students";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";

/**
 * Plain GET form — no client JS required. Submitting always drops any
 * existing `page` param (not included as a field here), which correctly
 * resets pagination whenever filters change.
 */
export function StudentFiltersForm({
  filters,
  options,
}: {
  filters: StudentFilters;
  options: StudentFilterOptions;
}) {
  return (
    <form
      method="GET"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by name or email
        </label>
        <input
          id="q"
          name="q"
          type="text"
          defaultValue={filters.q}
          placeholder="e.g. Ayesha Khan"
          className={fieldClasses}
        />
      </div>

      <div className="flex min-w-[130px] flex-col gap-1">
        <label htmlFor="student_number" className={labelClasses}>
          Student #
        </label>
        <input
          id="student_number"
          name="student_number"
          type="text"
          defaultValue={filters.studentNumber}
          className={fieldClasses}
        />
      </div>

      <div className="flex min-w-[140px] flex-col gap-1">
        <label htmlFor="status" className={labelClasses}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={filters.status}
          className={fieldClasses}
        >
          <option value="">All</option>
          {STUDENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="department" className={labelClasses}>
          Department
        </label>
        <select
          id="department"
          name="department"
          defaultValue={filters.departmentId}
          className={fieldClasses}
        >
          <option value="">All</option>
          {options.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1">
        <label htmlFor="program" className={labelClasses}>
          Program
        </label>
        <select
          id="program"
          name="program"
          defaultValue={filters.programId}
          className={fieldClasses}
        >
          <option value="">All</option>
          {options.programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Apply
        </button>
        <Link
          href="/management/students"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
