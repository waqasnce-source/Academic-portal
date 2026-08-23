import type { CurriculumStatus, GpaFigure, CategoryProgress } from "@/lib/academic/degree-audit";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";

/**
 * Shared, role-agnostic rendering for degree-audit results — used by both
 * `/management/students/[id]` (Student 360°) and `/student/degree-progress`,
 * so the two never drift into two different renderings of the same
 * computed data. Mirrors the existing convention in
 * app/_components/academic-status.tsx (shared status-engine rendering).
 * Neither component here recomputes anything — both take an already
 * computed DegreeAuditResult's fields as props.
 */

export const CURRICULUM_STATUS_LABELS: Record<CurriculumStatus, string> = {
  not_configured: "No Curriculum Configured",
  partially_configured: "Curriculum Not Applicable to This Track",
  configured_satisfied: "Coursework Satisfied",
  configured_incomplete: "Coursework Incomplete",
};

export const CURRICULUM_STATUS_TONES: Record<CurriculumStatus, BadgeTone> = {
  not_configured: "neutral",
  partially_configured: "warning",
  configured_satisfied: "success",
  configured_incomplete: "info",
};

export function CurriculumStatusBadge({ status }: { status: CurriculumStatus }) {
  return <StatusBadge label={CURRICULUM_STATUS_LABELS[status]} tone={CURRICULUM_STATUS_TONES[status]} />;
}

export function GpaCard({ title, gpa }: { title: string; gpa: GpaFigure | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      {!gpa || gpa.gpa === null ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {!gpa
            ? "No semesters enrolled yet."
            : "No published, uniquely-attempted, grade-point-resolvable courses yet."}
        </p>
      ) : (
        <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
          {gpa.gpa.toFixed(2)}{" "}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">({gpa.creditHoursCounted} CH)</span>
        </p>
      )}
      {gpa && !gpa.gradingScaleConfigured && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          No institutional grading scale is configured — grade points shown are exactly as entered by faculty, not
          derived from any scale.
        </p>
      )}
      {gpa && gpa.coursesExcludedMultipleAttempts.length > 0 && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          {gpa.coursesExcludedMultipleAttempts.length} course(s) excluded — multiple completed attempts exist and no
          repeat/improvement rule is configured ({gpa.coursesExcludedMultipleAttempts.map((c) => c.code).join(", ")}).
        </p>
      )}
      {gpa && gpa.coursesExcludedNoGradePoint.length > 0 && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {gpa.coursesExcludedNoGradePoint.length} course(s) excluded — no resolvable grade point.
        </p>
      )}
    </div>
  );
}

export function CategoryProgressTable({ byCategory }: { byCategory: CategoryProgress[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Category</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Completed CH</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Required CH</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Mandatory Courses</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {byCategory.map((c) => (
            <tr key={c.category}>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300 capitalize">
                {c.category.replace(/_/g, " ")}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                {c.completedCreditHours}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                {c.requiredCreditHours ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {c.mandatoryCourses.length > 0
                  ? `${c.mandatoryCourses.filter((m) => m.completed).length} / ${c.mandatoryCourses.length} completed`
                  : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                {c.quotaConfiguredWithNoEligibleCourses ? (
                  <StatusBadge label="No eligible courses configured" tone="warning" />
                ) : (
                  <StatusBadge label={c.satisfied ? "Satisfied" : "Incomplete"} tone={c.satisfied ? "success" : "neutral"} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MissingMandatoryList({
  courses,
}: {
  courses: { courseId: string; code: string; name: string; creditHours: number }[];
}) {
  if (courses.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
      <p className="font-medium text-amber-800 dark:text-amber-400">Missing mandatory courses</p>
      <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
        {courses.map((m) => (
          <li key={m.courseId}>
            {m.code} — {m.name} ({m.creditHours} CH)
          </li>
        ))}
      </ul>
    </div>
  );
}
