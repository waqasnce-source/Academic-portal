import { requireRole } from "@/lib/supabase/dal";
import { getCurrentStudentId } from "@/lib/academic/identity";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import {
  CurriculumStatusBadge,
  CategoryProgressTable,
  MissingMandatoryList,
  GpaCard,
} from "@/app/_components/degree-audit-display";

/**
 * Thin, read-only wrapper around getStudentDegreeAudit() — the same
 * computation engine and rendering components the Student 360° management
 * view uses (app/_components/degree-audit-display.tsx). No new computation
 * logic here.
 */
export default async function StudentDegreeProgressPage() {
  const profile = await requireRole("student");
  const studentId = await getCurrentStudentId(profile.id);

  if (!studentId) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No academic record found</p>
      </div>
    );
  }

  const audit = await getStudentDegreeAudit(studentId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Degree Progress</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Coursework and degree-audit summary</p>
      </div>

      {!audit ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Degree audit unavailable.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <CurriculumStatusBadge status={audit.curriculumStatus} />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Enrolled across {audit.semesterProgress.distinctSemestersEnrolled} semester
              {audit.semesterProgress.distinctSemestersEnrolled === 1 ? "" : "s"}
            </span>
          </div>

          {audit.curriculumStatus === "not_configured" && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No curriculum requirements are configured for your program yet — coursework progress cannot be
              evaluated until Management configures them.
            </p>
          )}
          {audit.curriculumStatus === "partially_configured" && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Curriculum requirements are configured for this program, but none apply to your specific
              specialization/entry-basis combination yet.
            </p>
          )}

          {audit.curriculumStatus !== "not_configured" && audit.curriculumStatus !== "partially_configured" && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MiniStat label="CH Completed" value={audit.totalCompletedCreditHours} />
                <MiniStat label="CH Required" value={audit.totalRequiredCreditHours ?? "—"} />
                <MiniStat label="CH Remaining" value={audit.totalRemainingCreditHours ?? "—"} />
                <MiniStat label="Missing Mandatory" value={audit.missingMandatoryCourses.length} />
              </div>

              <CategoryProgressTable byCategory={audit.byCategory} />
              <MissingMandatoryList courses={audit.missingMandatoryCourses} />
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <GpaCard title="CGPA (cumulative)" gpa={audit.cgpa} />
            <GpaCard title="Current Semester GPA" gpa={audit.currentSemesterGpa} />
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
