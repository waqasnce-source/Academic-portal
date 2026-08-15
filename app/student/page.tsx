import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentStudentId, getStudentProfileSummary } from "@/lib/academic/identity";
import { getStudentAcademicStatus } from "@/lib/academic/status-engine";
import { getActiveSupervisor } from "@/lib/academic/supervisors";
import { getDocumentSubmissionsForStudent } from "@/lib/academic/documents";
import { getResearchProjectForStudent, getLatestResearchProposal } from "@/lib/academic/research";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import { getThesisRecordForStudent, getVivaExaminationForStudent } from "@/lib/academic/thesis";
import { getRecentNotificationsForProfile } from "@/lib/management/notifications";
import { StudentStatusBadge, MilestoneStatusBadge, ProgressBar, formatAcademicDate } from "@/app/_components/academic-status";
import { CurriculumStatusBadge } from "@/app/_components/degree-audit-display";
import { NotificationsWidget } from "@/app/_components/notifications-widget";

export default async function StudentPage() {
  const profile = await requireRole("student");
  const studentId = await getCurrentStudentId(profile.id);
  const recentNotifications = await getRecentNotificationsForProfile(profile.id, 5);

  if (!studentId) {
    return (
      <div className="space-y-8">
        <NotificationsWidget notifications={recentNotifications} revalidatePath="/student" />
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No academic record found
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your account has a student profile, but no student record has been provisioned yet.
            Contact Management if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const [summary, status, supervisor, documentSubmissions, researchProject, degreeAudit, thesis] = await Promise.all([
    getStudentProfileSummary(studentId),
    getStudentAcademicStatus(studentId),
    getActiveSupervisor(studentId),
    getDocumentSubmissionsForStudent(studentId),
    getResearchProjectForStudent(studentId),
    getStudentDegreeAudit(studentId),
    getThesisRecordForStudent(studentId),
  ]);
  const latestProposal = researchProject ? await getLatestResearchProposal(researchProject.id) : null;
  const viva = thesis ? await getVivaExaminationForStudent(studentId) : null;

  // Only the latest version per requirement counts — an old
  // corrections_required version that was since resubmitted and approved
  // should not still show up as needing action.
  const latestByRequirement = new Map<string, (typeof documentSubmissions)[number]>();
  for (const s of documentSubmissions) {
    const existing = latestByRequirement.get(s.document_requirement_id);
    if (!existing || s.version > existing.version) latestByRequirement.set(s.document_requirement_id, s);
  }
  const documentsNeedingAction = Array.from(latestByRequirement.values()).filter(
    (s) => s.status === "corrections_required"
  );

  const deadlineMilestone = status?.currentMilestone ?? status?.nextMilestone ?? null;
  const deadline = deadlineMilestone?.record?.due_date ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Welcome, {profile.full_name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Student dashboard</p>
      </div>

      <NotificationsWidget notifications={recentNotifications} revalidatePath="/student" />

      {!summary || !status ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center dark:border-zinc-700">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Academic progress is not available yet
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your program assignment may not be complete. Contact Management if this persists.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Student ID" value={summary.student_number} />
            <Field label="Program" value={summary.program?.name ?? "—"} />
            <Field label="Discipline" value={summary.program?.department.name ?? "—"} />
            <Field label="Specialization" value={summary.specialization?.name ?? "Not assigned"} />
            <Field label="Admission Year" value={String(summary.admission_year)} />
            <Field
              label="Supervisor"
              value={supervisor ? `${supervisor.faculty.name} (${supervisor.faculty.designation})` : "Not assigned"}
            />
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Current Academic Stage
                </p>
                <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {status.currentStage ?? (status.statusLabel === "COMPLETED" ? "Completed" : "—")}
                </p>
              </div>
              <StudentStatusBadge statusLabel={status.statusLabel} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Current Milestone
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {status.currentMilestone?.title ?? "None — all required milestones complete"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Next Milestone
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {status.nextMilestone?.title ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Deadline
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {deadline ? formatAcademicDate(deadline) : "No deadline set"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Extension Status
                </p>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {status.extensionStatus.active
                    ? `Active${
                        status.extensionStatus.extension?.requested_to
                          ? ` through ${formatAcademicDate(status.extensionStatus.extension.requested_to)}`
                          : ""
                      }`
                    : "None active"}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <ProgressBar percentage={status.progressPercentage} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SummaryCount label="Overdue milestones" count={status.overdueMilestones.length} tone="danger" />
              <SummaryCount label="Upcoming deadlines (30 days)" count={status.upcomingDeadlines.length} tone="warning" />
            </div>

            <Link
              href="/student/progress"
              className="mt-6 inline-block rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              View full academic progress
            </Link>
          </section>

          {degreeAudit && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Coursework / Degree Progress
                </p>
                <CurriculumStatusBadge status={degreeAudit.curriculumStatus} />
              </div>
              {degreeAudit.curriculumStatus === "not_configured" ? (
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Curriculum requirements have not been configured for your program yet.
                </p>
              ) : degreeAudit.curriculumStatus === "partially_configured" ? (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Curriculum requirements are configured, but not yet for your specific specialization/track.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">CH Completed</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {degreeAudit.totalCompletedCreditHours}
                    </p>
                  </div>
                  <SummaryCount
                    label="Missing Mandatory"
                    count={degreeAudit.missingMandatoryCourses.length}
                    tone="danger"
                  />
                  <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">CGPA</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {degreeAudit.cgpa.gpa !== null ? degreeAudit.cgpa.gpa.toFixed(2) : "—"}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Current Semester GPA</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      {degreeAudit.currentSemesterGpa?.gpa !== null && degreeAudit.currentSemesterGpa?.gpa !== undefined
                        ? degreeAudit.currentSemesterGpa.gpa.toFixed(2)
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/student/degree-progress"
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  View full degree progress
                </Link>
                <Link
                  href="/student/courses"
                  className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  View my courses
                </Link>
              </div>
            </section>
          )}

          {researchProject && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Research Proposal
              </p>
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

          {thesis && (
            <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Thesis &amp; Viva
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {thesis.thesis_title ?? "Untitled thesis"}
              </p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Thesis Status
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {thesis.status ? thesis.status.replace(/_/g, " ") : "—"}
                    {thesis.submission_date ? ` · Submitted ${formatAcademicDate(thesis.submission_date)}` : ""}
                  </p>
                </div>
                {viva && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Viva Voce
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {viva.status ?? "—"}
                      {viva.scheduled_date ? ` · Scheduled ${formatAcademicDate(viva.scheduled_date)}` : ""}
                      {viva.result ? ` · Result: ${viva.result}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {documentsNeedingAction.length > 0 && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                Corrections Required ({documentsNeedingAction.length})
              </p>
              <ul className="mt-3 space-y-2">
                {documentsNeedingAction.map((d) => (
                  <li key={d.id} className="text-sm text-amber-800 dark:text-amber-400">
                    <span className="font-medium">{d.requirement?.document_name ?? "Document"}</span>
                    {d.remarks ? ` — ${d.remarks}` : ""}
                  </li>
                ))}
              </ul>
              <Link
                href="/student/progress"
                className="mt-3 inline-block text-sm text-amber-800 underline hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Go to Academic Progress to resubmit
              </Link>
            </section>
          )}
        </>
      )}
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

function SummaryCount({ label, count, tone }: { label: string; count: number; tone: "danger" | "warning" }) {
  const toneClasses =
    count === 0
      ? "border-zinc-200 dark:border-zinc-800"
      : tone === "danger"
        ? "border-red-200 dark:border-red-900"
        : "border-amber-200 dark:border-amber-900";
  return (
    <div className={`rounded-md border px-3 py-2 ${toneClasses}`}>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{count}</p>
    </div>
  );
}
