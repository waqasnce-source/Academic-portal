import Link from "next/link";
import type { SemesterSummary } from "@/lib/management/academic-sessions";

/** Color per semester status, distinct from the gold "Current" marker (a separate, already-established brand accent for whichever single semester is actually selected as current). */
const STATUS_BADGE_CLASSES: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  ongoing: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  completed: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
};

/**
 * The Fall/Spring semester-card grid, extracted out of SessionOverviewPanel
 * so the dashboard can render the exact same cards without also pulling in
 * that component's top stat row (the dashboard intentionally shows only
 * navigation, not a wall of statistics) — same markup, not a duplicate.
 */
export function SemesterCardGrid({ semesters, currentSemesterId }: { semesters: SemesterSummary[]; currentSemesterId: string | null }) {
  if (semesters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No courses have been offered in this session.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {semesters.map((semester) => {
        const isCurrent = semester.id === currentSemesterId;
        return (
          <Link
            key={semester.id}
            href={`/management/semesters/${semester.id}`}
            className={`block rounded-lg border bg-white p-5 hover:border-slate-400 dark:bg-slate-950 dark:hover:border-slate-600 ${
              isCurrent
                ? "border-brand-700 ring-1 ring-brand-700 dark:border-brand-400 dark:ring-brand-400"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-slate-50">{semester.name}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                  isCurrent
                    ? "bg-gold-500 text-brand-950 dark:bg-gold-400"
                    : (STATUS_BADGE_CLASSES[semester.status] ?? STATUS_BADGE_CLASSES.completed)
                }`}
              >
                {isCurrent ? "Current" : semester.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {new Date(semester.startDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              {" – "}
              {new Date(semester.endDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Courses</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">{semester.offeringCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Credit Hours</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">{semester.totalCreditHours}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Faculty</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">{semester.facultyCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Students</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-50">{semester.studentCount}</dd>
              </div>
            </dl>
          </Link>
        );
      })}
    </div>
  );
}
