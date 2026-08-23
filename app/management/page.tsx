import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getAcademicSessionsOverview,
  getCurrentAcademicYear,
  getCurrentSemesterId,
  getSemesterOperations,
} from "@/lib/management/academic-sessions";
import { getAcademicProgressStatusTiles } from "@/lib/management/academic-progress";
import { SemesterCardGrid } from "./academic-sessions/_components/semester-card-grid";

const QUICK_ACCESS = [
  { label: "Students", href: "/management/students" },
  { label: "Faculty", href: "/management/faculty" },
  { label: "Student Progress", href: "/management/academic-progress" },
  { label: "Programs & Curriculum", href: "/management/programs" },
];

const ADMINISTRATION_LINKS = [
  { label: "Reports", href: "/management/reports" },
  { label: "Documents", href: "/management/documents" },
  { label: "Bulk Import", href: "/management/bulk-import" },
  { label: "Settings", href: "/management/settings" },
];

export default async function ManagementOverviewPage() {
  await requireRole("management");

  const [sessions, tiles] = await Promise.all([getAcademicSessionsOverview(), getAcademicProgressStatusTiles()]);
  const currentYear = getCurrentAcademicYear(sessions);
  const currentSession = currentYear ? (sessions.find((s) => s.academicYear === currentYear) ?? null) : null;
  const currentSemesterId = currentSession ? getCurrentSemesterId(currentSession) : null;
  const currentOps = currentSemesterId ? await getSemesterOperations(currentSemesterId) : null;

  const alerts: { label: string; href: string }[] = [];
  if (tiles.byStatusLabel.DELAYED > 0) {
    alerts.push({
      label: `${tiles.byStatusLabel.DELAYED} student${tiles.byStatusLabel.DELAYED === 1 ? "" : "s"} delayed`,
      href: "/management/academic-progress?overall=DELAYED",
    });
  }
  if (tiles.requiringAction > 0) {
    alerts.push({
      label: `${tiles.requiringAction} student${tiles.requiringAction === 1 ? "" : "s"} requiring attention`,
      href: "/management/academic-progress",
    });
  }
  if (currentOps && currentOps.offerings.withoutFaculty > 0) {
    alerts.push({
      label: `${currentOps.offerings.withoutFaculty} course${currentOps.offerings.withoutFaculty === 1 ? "" : "s"} this semester missing faculty`,
      href: `/management/semesters/${currentSemesterId}`,
    });
  }
  if (currentOps && currentOps.offerings.withoutStudents > 0) {
    alerts.push({
      label: `${currentOps.offerings.withoutStudents} course${currentOps.offerings.withoutStudents === 1 ? "" : "s"} this semester with no enrolled students`,
      href: `/management/semesters/${currentSemesterId}`,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">NCEG Academic Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Start with the current academic session, or jump straight to students, faculty, or courses below.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Current Academic Session {currentYear ? `— ${currentYear}` : ""}
          </h2>
          <Link href="/management/academic-sessions" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
            All sessions →
          </Link>
        </div>
        {currentSession ? (
          <SemesterCardGrid semesters={currentSession.semesters} currentSemesterId={currentSemesterId} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No academic sessions yet</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create a semester with an academic year and at least one course offering to see it here.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACCESS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-200 bg-white px-4 py-4 text-center text-sm font-medium text-slate-900 hover:border-brand-400 hover:text-brand-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:border-brand-500 dark:hover:text-brand-300"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Current Alerts</h2>
          <div className="divide-y divide-slate-200 rounded-lg border border-amber-200 bg-amber-50 dark:divide-slate-800 dark:border-amber-900 dark:bg-amber-950/30">
            {alerts.map((alert, i) => (
              <Link
                key={i}
                href={alert.href}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-amber-800 hover:underline dark:text-amber-300"
              >
                {alert.label}
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2 border-t border-slate-200 pt-6 dark:border-slate-800">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-600">Administration</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {ADMINISTRATION_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
