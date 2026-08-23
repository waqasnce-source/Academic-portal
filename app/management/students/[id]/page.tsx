import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getStudentProfileSummary } from "@/lib/academic/identity";
import { getStudentAcademicStatus } from "@/lib/academic/status-engine";
import { getEffectiveMilestonesForStudent } from "@/lib/academic/milestones";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import { getSupervisorAssignmentsForStudent } from "@/lib/academic/supervisors";
import { getResearchProjectForStudent, getResearchProposalsForProject } from "@/lib/academic/research";
import { getDocumentSubmissionsForStudent } from "@/lib/academic/documents";
import { getExtensionApplicationsForStudent } from "@/lib/academic/extensions";
import { getThesisRecordForStudent, getVivaExaminationForStudent, getResultDeclarationForStudent } from "@/lib/management/thesis";
import { getLinkedAccountInfo, getUnlinkedProfiles, getAuthConfirmationState } from "@/lib/management/accounts";
import { UUID_RE } from "@/lib/management/query-params";
import { StudentStatusBadge, MilestoneStatusBadge, ProgressBar, formatAcademicDate } from "@/app/_components/academic-status";
import { StatusBadge } from "@/app/management/_components/status-badge";
import {
  CurriculumStatusBadge,
  CategoryProgressTable,
  MissingMandatoryList,
  GpaCard,
} from "@/app/_components/degree-audit-display";
import { CourseworkSyncButton } from "./_components/coursework-sync-button";
import { LinkStudentAccountForm } from "./_components/link-account-form";
import { InviteStudentAccountForm } from "./_components/invite-account-form";
import { toggleAccountStatusAction } from "./actions";

export default async function ManagementStudentDetailPage(props: PageProps<"/management/students/[id]">) {
  await requireRole("management");

  const { id: studentId } = await props.params;
  if (!UUID_RE.test(studentId)) notFound();

  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) notFound();

  const [status, milestones, supervisorHistory, project, documents, extensions, thesis, degreeAudit, linkedAccount] =
    await Promise.all([
      getStudentAcademicStatus(studentId),
      getEffectiveMilestonesForStudent(studentId, summary.program.degree_level, summary.program.id, summary.phd_entry_basis),
      getSupervisorAssignmentsForStudent(studentId),
      getResearchProjectForStudent(studentId),
      getDocumentSubmissionsForStudent(studentId),
      getExtensionApplicationsForStudent(studentId),
      getThesisRecordForStudent(studentId),
      getStudentDegreeAudit(studentId),
      getLinkedAccountInfo("student", studentId),
    ]);
  const unlinkedProfiles = linkedAccount ? [] : await getUnlinkedProfiles("student");
  const authConfirmation = linkedAccount ? await getAuthConfirmationState(linkedAccount.profileId) : null;

  const [proposals, viva, resultDeclaration] = await Promise.all([
    project ? getResearchProposalsForProject(project.id) : Promise.resolve([]),
    getVivaExaminationForStudent(studentId),
    getResultDeclarationForStudent(studentId),
  ]);
  const latestProposal = proposals[0] ?? null;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/management/students" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Student Management
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{summary.full_name}</h1>
          <div className="flex items-center gap-2">
            <StatusBadge label={summary.status} tone={summary.status === "active" ? "success" : "neutral"} />
            {status && <StudentStatusBadge statusLabel={status.statusLabel} />}
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Student ID" value={summary.student_number} />
        <Field label="Email" value={summary.email || "—"} />
        <Field label="Program" value={summary.program.name} />
        <Field label="Discipline" value={summary.program.department.name} />
        <Field label="Specialization" value={summary.specialization?.name ?? "Not assigned"} />
        <Field label="Admission Year" value={String(summary.admission_year)} />
        {summary.program.degree_level === "phd" && (
          <Field label="PhD Entry Basis" value={summary.phd_entry_basis ?? "Not recorded"} />
        )}
        <Field
          label="Supervisor(s)"
          value={
            supervisorHistory
              .filter((a) => a.status === "active")
              .map((a) => `${a.faculty.name} (${a.role === "supervisor" ? "Supervisor" : "Co-Supervisor"})`)
              .join(", ") || "None assigned"
          }
        />
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account / Identity</h2>
        {linkedAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Linked to <span className="font-medium">{linkedAccount.fullName}</span> ({linkedAccount.email})
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {authConfirmation === null
                  ? "Invitation status could not be determined."
                  : authConfirmation.emailConfirmed
                    ? "Invitation accepted — password set."
                    : "Invitation sent — waiting for the account holder to set a password."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {authConfirmation && !authConfirmation.emailConfirmed && <StatusBadge label="Invitation pending" tone="warning" />}
              <StatusBadge
                label={linkedAccount.status}
                tone={linkedAccount.status === "active" ? "success" : linkedAccount.status === "suspended" ? "danger" : "neutral"}
              />
              <form
                action={toggleAccountStatusAction.bind(
                  null,
                  studentId,
                  linkedAccount.profileId,
                  linkedAccount.status === "suspended" ? "active" : "suspended"
                )}
              >
                <button type="submit" className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                  {linkedAccount.status === "suspended" ? "Reactivate account" : "Suspend account"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Invite a new account
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sends an email invitation. The student sets their own password by following the link — Management
                never sets or sees a password.
              </p>
              <InviteStudentAccountForm studentId={studentId} defaultEmail={summary.email} />
            </div>
            <div className="space-y-2 border-t border-slate-200 pt-5 dark:border-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Or link an existing account
              </p>
              <LinkStudentAccountForm studentId={studentId} options={unlinkedProfiles} />
            </div>
          </div>
        )}
      </section>

      {status && (
        <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Current Academic Stage
            </p>
            <Link
              href={`/management/academic-progress/${studentId}?backHref=/management/students/${studentId}&backLabel=${encodeURIComponent(summary.full_name)}`}
              className="text-xs font-medium text-brand-700 underline hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
            >
              View full Academic Progress →
            </Link>
          </div>
          <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
            {status.currentStage ?? (status.statusLabel === "COMPLETED" ? "Completed" : "—")}
          </p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
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

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supervisor History ({supervisorHistory.length})</h2>
        {supervisorHistory.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No supervisor assignments recorded.</p>
        ) : (
          <ul className="space-y-2">
            {supervisorHistory.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">
                  {a.faculty.name} — {a.role === "supervisor" ? "Supervisor" : "Co-Supervisor"}
                  {" · "}
                  {formatAcademicDate(a.assigned_date)} {a.end_date ? `– ${formatAcademicDate(a.end_date)}` : "– present"}
                </span>
                <StatusBadge label={a.status} tone={a.status === "active" ? "success" : "neutral"} />
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/management/supervisor-assignments/new"
          className="inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          Assign Supervisor
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Milestone Timeline ({milestones.length})</h2>
        <ol className="space-y-2">
          {milestones.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300">
                Step {m.sequence_no} — {m.title}
                {!m.required && " (Optional)"}
              </span>
              <MilestoneStatusBadge status={m.status} />
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Coursework / Degree Audit</h2>
        {degreeAudit ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <CurriculumStatusBadge status={degreeAudit.curriculumStatus} />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Enrolled across {degreeAudit.semesterProgress.distinctSemestersEnrolled} semester
                {degreeAudit.semesterProgress.distinctSemestersEnrolled === 1 ? "" : "s"}
              </span>
              {degreeAudit.satisfiesCourseworkRequirement && <CourseworkSyncButton studentId={studentId} />}
            </div>

            {degreeAudit.curriculumStatus === "not_configured" && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No curriculum requirements are configured for this program yet — coursework progress cannot be
                evaluated until management configures them under Curriculum Requirements.
              </p>
            )}
            {degreeAudit.curriculumStatus === "partially_configured" && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                This program has curriculum requirements configured, but none apply to this student&apos;s specific
                specialization/entry-basis combination — coursework progress cannot be evaluated for them yet.
              </p>
            )}

            {degreeAudit.curriculumStatus !== "not_configured" && degreeAudit.curriculumStatus !== "partially_configured" && (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MiniStat label="CH Completed" value={degreeAudit.totalCompletedCreditHours} />
                  <MiniStat label="CH Required" value={degreeAudit.totalRequiredCreditHours ?? "—"} />
                  <MiniStat label="CH Remaining" value={degreeAudit.totalRemainingCreditHours ?? "—"} />
                  <MiniStat label="Missing Mandatory" value={degreeAudit.missingMandatoryCourses.length} />
                </div>

                <CategoryProgressTable byCategory={degreeAudit.byCategory} />
                <MissingMandatoryList courses={degreeAudit.missingMandatoryCourses} />
              </>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GpaCard title="CGPA (cumulative)" gpa={degreeAudit.cgpa} />
              <GpaCard title="Current Semester GPA" gpa={degreeAudit.currentSemesterGpa} />
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Degree audit unavailable for this student.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Research Proposal (GSC/ASRB)</h2>
        {project ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <p className="font-medium text-slate-900 dark:text-slate-50">{project.title}</p>
            <p className="text-slate-500 dark:text-slate-400">
              Supervisor: {project.supervisor?.name ?? "—"} {project.status ? `· ${project.status}` : ""}
            </p>
            {latestProposal && (
              <p className="text-slate-600 dark:text-slate-400">
                Latest version (v{latestProposal.version}): GSC {latestProposal.gsc_status?.replace(/_/g, " ") ?? "not started"} ·
                {" "}
                ASRB {latestProposal.asrb_status?.replace(/_/g, " ") ?? "not started"}
              </p>
            )}
            <Link
              href={`/management/research-proposals/${project.id}`}
              className="inline-block text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            >
              Manage Research Proposal
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No research project recorded yet.{" "}
            <Link href="/management/research-proposals/new" className="underline hover:text-slate-900 dark:hover:text-slate-50">
              Record one
            </Link>
            .
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No documents submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">
                  {d.requirement?.document_name ?? "Document"} (v{d.version}) — {formatAcademicDate(d.submitted_at)}
                </span>
                <span className="flex items-center gap-2">
                  <MilestoneStatusBadge status={d.status} />
                  <Link href={`/management/documents/${d.id}`} className="text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                    Review
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Extensions ({extensions.length})</h2>
        {extensions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No extension applications recorded.</p>
        ) : (
          <ul className="space-y-2">
            {extensions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">
                  {formatAcademicDate(e.application_date)} · {e.requested_extension_semesters ?? "—"} semester(s) requested
                </span>
                <StatusBadge label={e.status.replace(/_/g, " ")} tone={e.status === "approved" ? "success" : e.status === "rejected" ? "danger" : "info"} />
              </li>
            ))}
          </ul>
        )}
        <Link href="/management/extensions/new" className="inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
          Record Extension Application
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Thesis, Viva &amp; Result</h2>
        {thesis ? (
          <div className="space-y-2 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-800">
            <p className="font-medium text-slate-900 dark:text-slate-50">{thesis.thesis_title ?? "Untitled thesis"}</p>
            <p className="text-slate-500 dark:text-slate-400">
              Status: {thesis.status ?? "—"} · Submitted: {formatAcademicDate(thesis.submission_date)}
            </p>
            {viva && (
              <p className="text-slate-600 dark:text-slate-400">
                Viva: {viva.status ?? "—"} {viva.result ? `· Result: ${viva.result}` : ""}
              </p>
            )}
            {resultDeclaration && (
              <p className="text-slate-600 dark:text-slate-400">
                Result Declaration: {resultDeclaration.status ?? "—"} on {formatAcademicDate(resultDeclaration.declaration_date)}
              </p>
            )}
            <Link href={`/management/thesis/${thesis.id}`} className="inline-block text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
              Manage Thesis Record
            </Link>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No thesis record yet.{" "}
            <Link href="/management/thesis/new" className="underline hover:text-slate-900 dark:hover:text-slate-50">
              Create one
            </Link>
            .
          </p>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-900 dark:text-slate-50">{value}</p>
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
