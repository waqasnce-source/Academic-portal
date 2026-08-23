import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getAcademicSessionsOverview, getCurrentAcademicYear, getCurrentSemesterId } from "@/lib/management/academic-sessions";
import { SessionSelector } from "../_components/session-selector";
import { SessionOverviewPanel } from "../_components/session-overview-panel";
import { Breadcrumb } from "@/app/management/_components/breadcrumb";

export default async function AcademicSessionDetailPage(
  props: PageProps<"/management/academic-sessions/[academicYear]">
) {
  await requireRole("management");

  const { academicYear: rawYear } = await props.params;
  const academicYear = decodeURIComponent(rawYear);

  // Single shared fetch, same as the landing page — both the selector's
  // full year list and this page's matched session come from one call,
  // rather than a second aggregation query on top of it.
  const sessions = await getAcademicSessionsOverview();
  const session = sessions.find((s) => s.academicYear === academicYear);
  if (!session) notFound();

  const currentYear = getCurrentAcademicYear(sessions);
  const years = [...sessions].reverse().map((s) => s.academicYear);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumb items={[{ label: "Academic Sessions", href: "/management/academic-sessions" }, { label: session.academicYear }]} />
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Academic Session {session.academicYear}</h1>
            {session.academicYear === currentYear && (
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-medium text-brand-950 dark:bg-gold-400">
                Current
              </span>
            )}
          </div>
        </div>
        <Link
          href="/management/reports/teaching-load"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          Faculty Teaching
        </Link>
      </div>

      <SessionSelector years={years} currentYear={currentYear} selectedYear={session.academicYear} />

      <SessionOverviewPanel session={session} currentSemesterId={getCurrentSemesterId(session)} />
    </div>
  );
}
