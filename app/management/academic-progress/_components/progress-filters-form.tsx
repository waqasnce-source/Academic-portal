import Link from "next/link";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { OVERALL_STAGES } from "@/lib/academic/status-engine";
import { STUDENT_STATUSES } from "@/lib/management/status-enums";
import type { AcademicProgressFilters, AcademicProgressFilterOptions } from "@/lib/management/academic-progress";

const STATUS_LABELS = ["ON_TRACK", "DUE_SOON", "DELAYED", "EXTENDED", "COMPLETED", "ON_HOLD"] as const;
const STATUS_LABEL_TEXT: Record<string, string> = {
  ON_TRACK: "On Track",
  DUE_SOON: "Due Soon",
  DELAYED: "Delayed",
  EXTENDED: "Extended",
  COMPLETED: "Completed",
  ON_HOLD: "On Hold",
};

export function ProgressFiltersForm({
  filters,
  options,
  currentAcademicYear,
}: {
  filters: AcademicProgressFilters;
  options: AcademicProgressFilterOptions;
  currentAcademicYear: string | null;
}) {
  const selectedSession = filters.academicYear || currentAcademicYear || "";

  return (
    <form
      method="GET"
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="q" className={labelClasses}>
          Search by name or student ID
        </label>
        <input id="q" name="q" type="text" defaultValue={filters.q} className={fieldClasses} placeholder="Search students…" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="degree" className={labelClasses}>
            Degree Level
          </label>
          <select id="degree" name="degree" defaultValue={filters.degreeLevel} className={fieldClasses}>
            <option value="">All</option>
            <option value="master">MS/M.Phil.</option>
            <option value="phd">Ph.D.</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="department" className={labelClasses}>
            Discipline
          </label>
          <select id="department" name="department" defaultValue={filters.departmentId} className={fieldClasses}>
            <option value="">All</option>
            {options.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="program" className={labelClasses}>
            Program
          </label>
          <select id="program" name="program" defaultValue={filters.programId} className={fieldClasses}>
            <option value="">All</option>
            {options.programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="session" className={labelClasses}>
            Academic Session
          </label>
          <select id="session" name="session" defaultValue={selectedSession || "all"} className={fieldClasses}>
            <option value="all">All Sessions</option>
            {options.academicYears.map((y) => (
              <option key={y} value={y}>
                {y}
                {y === currentAcademicYear ? " (Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="stage" className={labelClasses}>
            Current Stage
          </label>
          <select id="stage" name="stage" defaultValue={filters.stage} className={fieldClasses}>
            <option value="">All</option>
            {OVERALL_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="overall" className={labelClasses}>
            Overall Status
          </label>
          <select id="overall" name="overall" defaultValue={filters.statusLabel} className={fieldClasses}>
            <option value="">All</option>
            {STATUS_LABELS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL_TEXT[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="status" className={labelClasses}>
            Student Status
          </label>
          <select id="status" name="status" defaultValue={filters.studentStatus} className={fieldClasses}>
            <option value="">Active (default)</option>
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="supervisor" className={labelClasses}>
            Supervisor
          </label>
          <select id="supervisor" name="supervisor" defaultValue={filters.supervisorId} className={fieldClasses}>
            <option value="">All</option>
            {options.supervisors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-900">
        <button
          type="submit"
          className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Apply Filters
        </button>
        <Link
          href="/management/academic-progress"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
