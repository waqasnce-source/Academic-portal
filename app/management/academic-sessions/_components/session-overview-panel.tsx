import type { AcademicSessionSummary } from "@/lib/management/academic-sessions";
import { SemesterCardGrid } from "./semester-card-grid";

/**
 * Shared "session summary + Fall/Spring semester cards" render, used by
 * both the Academic Sessions landing page (for the current session) and
 * the per-session detail route (for whichever session is selected) — one
 * place producing this view so the two pages can never drift apart.
 */
export function SessionOverviewPanel({
  session,
  currentSemesterId,
}: {
  session: AcademicSessionSummary;
  currentSemesterId: string | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Semesters" value={session.semesters.length} />
        <Stat label="Courses Offered" value={session.totalCourses} />
        <Stat label="Total Credit Hours" value={session.totalCreditHours} />
        <Stat label="Faculty Involved" value={session.facultyCount} />
        <Stat label="Students Enrolled" value={session.studentCount} />
        <Stat label="Disciplines" value={session.disciplines.length} />
      </div>

      {session.disciplines.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {session.disciplines.map((d) => d.name).join(" · ")}
        </p>
      )}

      <SemesterCardGrid semesters={session.semesters} currentSemesterId={currentSemesterId} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
