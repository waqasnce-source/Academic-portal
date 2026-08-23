import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentStudentId, getStudentProfileSummary } from "@/lib/academic/identity";
import { getEffectiveMilestonesForStudent } from "@/lib/academic/milestones";
import { MilestoneStatusBadge, formatAcademicDate } from "@/app/_components/academic-status";
import { EmptyState } from "@/app/management/_components/empty-state";

export default async function StudentProgressPage() {
  const profile = await requireRole("student");
  const studentId = await getCurrentStudentId(profile.id);
  if (!studentId) notFound();

  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) notFound();

  const milestones = await getEffectiveMilestonesForStudent(
    studentId,
    summary.program.degree_level,
    summary.program.id,
    summary.phd_entry_basis
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Academic Progress Timeline
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {milestones.length} milestone{milestones.length === 1 ? "" : "s"} in your degree-completion roadmap
        </p>
      </div>

      {milestones.length === 0 ? (
        <EmptyState entityLabelPlural="milestones" hasActiveFilters={false} clearHref="/student/progress" />
      ) : (
        <ol className="space-y-3">
          {milestones.map((m) => (
            <li key={m.id}>
              <Link
                href={`/student/progress/${m.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Step {m.sequence_no}
                      {m.category ? ` · ${m.category}` : ""}
                      {!m.required ? " · Optional" : ""}
                    </p>
                    <p className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">{m.title}</p>
                    {(m.record?.due_date || m.target_semester) && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {m.record?.due_date
                          ? `Due ${formatAcademicDate(m.record.due_date)}`
                          : m.target_semester
                            ? `Expected by semester ${m.target_semester}`
                            : null}
                      </p>
                    )}
                  </div>
                  <MilestoneStatusBadge status={m.status} />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
