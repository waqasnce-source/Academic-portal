import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId, getStudentProfileSummary } from "@/lib/academic/identity";
import { getActiveSuperviseesForFaculty, getSupervisorAssignmentsForStudent } from "@/lib/academic/supervisors";
import { getStudentAcademicStatus } from "@/lib/academic/status-engine";
import { getEffectiveMilestonesForStudent } from "@/lib/academic/milestones";
import { getDocumentRequirementsForMilestone, getDocumentSubmissionsForStudent } from "@/lib/academic/documents";
import { getResearchProjectForStudent, getLatestResearchProposal } from "@/lib/academic/research";
import { UUID_RE } from "@/lib/management/query-params";
import { StudentStatusBadge, MilestoneStatusBadge, ProgressBar } from "@/app/_components/academic-status";
import { MilestoneUpdateForm } from "./_components/milestone-update-form";

export default async function FacultyStudentDetailPage(props: PageProps<"/faculty/students/[id]">) {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) notFound();

  const { id: studentId } = await props.params;
  if (!UUID_RE.test(studentId)) notFound();

  // Defense in depth: RLS already scopes every academic-progress table to
  // active supervisees, but this explicit check gives a clean not-found
  // instead of a page full of empty sections for a non-supervisee id.
  const supervisees = await getActiveSuperviseesForFaculty(facultyId);
  if (!supervisees.some((s) => s.student.id === studentId)) notFound();

  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) notFound();

  const [status, milestones, supervisorHistory, documentSubmissions, researchProject] = await Promise.all([
    getStudentAcademicStatus(studentId),
    getEffectiveMilestonesForStudent(studentId, summary.program.degree_level, summary.program.id, summary.phd_entry_basis),
    getSupervisorAssignmentsForStudent(studentId),
    getDocumentSubmissionsForStudent(studentId),
    getResearchProjectForStudent(studentId),
  ]);
  const latestProposal = researchProject ? await getLatestResearchProposal(researchProject.id) : null;

  // Read-only for faculty — document_submissions has no faculty write
  // policy (Phase 3 scoped writes to management only), so this is purely
  // informational, matching "perform only actions explicitly authorized
  // by the current RLS/data-access design."
  const milestoneDocumentSummaries = await Promise.all(
    milestones.map(async (m) => {
      const requirements = await getDocumentRequirementsForMilestone(m.id);
      if (requirements.length === 0) return null;
      const latestByRequirement = new Map<string, (typeof documentSubmissions)[number]>();
      for (const s of documentSubmissions) {
        const existing = latestByRequirement.get(s.document_requirement_id);
        if (!existing || s.version > existing.version) latestByRequirement.set(s.document_requirement_id, s);
      }
      const submittedCount = requirements.filter((r) => latestByRequirement.has(r.id)).length;
      const needsCorrection = requirements.some((r) => latestByRequirement.get(r.id)?.status === "corrections_required");
      return { milestoneId: m.id, total: requirements.length, submittedCount, needsCorrection };
    })
  );
  const documentSummaryByMilestone = new Map(
    milestoneDocumentSummaries.filter((s) => s !== null).map((s) => [s.milestoneId, s])
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/faculty/students" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← My Students
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{summary.full_name}</h1>
          {status && <StudentStatusBadge statusLabel={status.statusLabel} />}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Student ID" value={summary.student_number} />
        <Field label="Program" value={summary.program.name} />
        <Field label="Discipline" value={summary.program.department.name} />
        <Field label="Specialization" value={summary.specialization?.name ?? "Not assigned"} />
        <Field label="Admission Year" value={String(summary.admission_year)} />
        <Field
          label="Supervisors"
          value={
            supervisorHistory
              .filter((a) => a.status === "active")
              .map((a) => `${a.faculty.name} (${a.role === "supervisor" ? "Supervisor" : "Co-Supervisor"})`)
              .join(", ") || "None"
          }
        />
      </section>

      {status && (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Current Academic Stage
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {status.currentStage ?? (status.statusLabel === "COMPLETED" ? "Completed" : "—")}
          </p>
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Next: {status.nextMilestone?.title ?? status.currentMilestone?.title ?? "No further action required"}
          </p>
          <div className="mt-4">
            <ProgressBar percentage={status.progressPercentage} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MiniStat label="Overdue" value={status.overdueMilestones.length} />
            <MiniStat label="Due soon" value={status.upcomingDeadlines.length} />
            <MiniStat label="Completed" value={status.completedMilestones.length} />
            <MiniStat label="Extension active" value={status.extensionStatus.active ? "Yes" : "No"} />
          </div>
        </section>
      )}

      {researchProject && (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Research Proposal</p>
          <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">{researchProject.title}</p>
          {latestProposal && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">GSC</p>
                  {latestProposal.gsc_status && <MilestoneStatusBadge status={latestProposal.gsc_status} />}
                </div>
                {latestProposal.gsc_comments && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{latestProposal.gsc_comments}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">ASRB</p>
                  {latestProposal.asrb_status && <MilestoneStatusBadge status={latestProposal.asrb_status} />}
                </div>
                {latestProposal.asrb_comments && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{latestProposal.asrb_comments}</p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Milestone Timeline ({milestones.length})
        </h2>
        <ol className="space-y-3">
          {milestones.map((m) => {
            const docSummary = documentSummaryByMilestone.get(m.id);
            return (
              <li key={m.id} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Step {m.sequence_no}
                      {m.category ? ` · ${m.category}` : ""}
                      {!m.required ? " · Optional" : ""}
                    </p>
                    <p className="mt-0.5 font-medium text-zinc-900 dark:text-zinc-50">{m.title}</p>
                    {docSummary && (
                      <p className={`mt-1 text-xs ${docSummary.needsCorrection ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 dark:text-zinc-400"}`}>
                        Documents: {docSummary.submittedCount}/{docSummary.total} submitted
                        {docSummary.needsCorrection ? " · correction requested" : ""}
                      </p>
                    )}
                  </div>
                  <MilestoneStatusBadge status={m.status} />
                </div>
                <MilestoneUpdateForm studentId={studentId} milestone={m} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
