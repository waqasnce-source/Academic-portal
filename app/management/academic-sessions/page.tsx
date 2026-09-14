import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getAcademicSessionsOverview,
  getCurrentAcademicYear,
  getCurrentSemesterId,
} from "@/lib/management/academic-sessions";
import { SessionSelector } from "./_components/session-selector";
import { SessionOverviewPanel } from "./_components/session-overview-panel";
import { SemesterCardGrid } from "./_components/semester-card-grid";

/**
 * Academic Sessions landing page: Academic Session -> Semester ->
 * Discipline -> Course -> Faculty -> Students. "Academic Session" is not
 * its own table -- it's semesters.academic_year, grouped -- so this page
 * is a pure read/aggregation view over the existing
 * semesters/course_offerings/course_offering_faculty/enrollments tables,
 * not a new data model.
 *
 * Opens with the current academic session's data shown immediately
 * (determined from real semester data, never hard-coded — see
 * getCurrentAcademicYear), with a selector to jump to any other session
 * and the full historical table below for browsing/comparison.
 */
export default async function AcademicSessionsPage() {
  await requireRole("management");

  const sessions = await getAcademicSessionsOverview();
  const currentYear = getCurrentAcademicYear(sessions);
  const currentSession = currentYear ? sessions.find((s) => s.academicYear === currentYear) ?? null : null;
  const years = [...sessions].reverse().map((s) => s.academicYear);

  // Nearest not-yet-started semester across every session, regardless of
  // which academic year it belongs to — shown alongside the current one so
  // "what's coming next" doesn't require digging into All Sessions below.
  const upcoming = sessions
    .flatMap((s) => s.semesters.map((sem) => ({ ...sem, academicYear: s.academicYear })))
    .filter((sem) => sem.status === "upcoming")
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Academic Sessions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Postgraduate teaching activity by academic session — Fall/Spring, courses, credit hours, and faculty
            involved. Figures are computed live from course offerings, not stored separately.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/management/reports/teaching-load"
            className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Faculty Teaching
          </Link>
          <Link
            href="/management/semesters/new"
            className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            + Add Semester
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No academic sessions yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a semester with an academic year (e.g. &ldquo;2024-25&rdquo;) and at least one course offering to
            see it here.
          </p>
          <Link
            href="/management/semesters/new"
            className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Add a semester
          </Link>
        </div>
      ) : (
        <>
          <SessionSelector years={years} currentYear={currentYear} selectedYear={currentYear ?? years[0]} />

          {currentSession && (
            <SessionOverviewPanel session={currentSession} currentSemesterId={getCurrentSemesterId(currentSession)} />
          )}

          {upcoming && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Upcoming — {upcoming.academicYear}
              </h2>
              <SemesterCardGrid semesters={[upcoming]} currentSemesterId={null} />
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Sessions</h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
                      Academic Session
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      Semesters
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      Total Courses
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      Total CH
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      Faculty
                    </th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                      Students
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {[...sessions].reverse().map((session) => (
                    <tr key={session.academicYear}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                        <Link
                          href={`/management/academic-sessions/${encodeURIComponent(session.academicYear)}`}
                          className="hover:underline"
                        >
                          {session.academicYear}
                        </Link>
                        <SessionBadge session={session} isCurrent={session.academicYear === currentYear} />
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-normal text-slate-500 dark:text-slate-400">
                          {session.semesters.map((s) => (
                            <span key={s.id}>
                              {s.name}: {s.offeringCount}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                        {session.semesters.length}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {session.totalCourses}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {session.totalCreditHours}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {session.facultyCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                        {session.studentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Color per session status, derived from its own semesters' statuses (same SEMESTER_STATUSES vocabulary the card grid uses) — never a second definition of "current", just an at-a-glance label for everything else. */
function SessionBadge({
  session,
  isCurrent,
}: {
  session: { semesters: { status: string }[] };
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-medium text-brand-950 dark:bg-gold-400">
        Current
      </span>
    );
  }

  const statuses = new Set(session.semesters.map((s) => s.status));
  const label = statuses.size === 1 ? [...statuses][0] : "mixed";
  const classes: Record<string, string> = {
    upcoming: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    ongoing: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    completed: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
    mixed: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  };

  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${classes[label]}`}>
      {label}
    </span>
  );
}
