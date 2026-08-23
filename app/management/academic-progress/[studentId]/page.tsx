import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { getStudentProfileSummary } from "@/lib/academic/identity";
import { getStudentAcademicStatus, deriveOverallStage } from "@/lib/academic/status-engine";
import { getEffectiveMilestonesForStudent } from "@/lib/academic/milestones";
import { getStudentDegreeAudit } from "@/lib/academic/degree-audit";
import { getSupervisorAssignmentsForStudent } from "@/lib/academic/supervisors";
import { getResearchProjectForStudent, getLatestResearchProposal } from "@/lib/academic/research";
import { getThesisRecordForStudent, getVivaExaminationForStudent } from "@/lib/academic/thesis";
import { getExtensionApplicationsForStudent, findActiveExtension } from "@/lib/academic/extensions";
import { getDocumentRequirementsForMilestone, getDocumentSubmissionsForStudent } from "@/lib/academic/documents";
import { getAcademicSessionsOverview, getCurrentAcademicYear } from "@/lib/management/academic-sessions";
import { UUID_RE } from "@/lib/management/query-params";
import { StudentStatusBadge, MilestoneStatusBadge, ProgressBar, formatAcademicDate } from "@/app/_components/academic-status";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { MilestoneTimeline, type MilestoneSourceLink, type MilestoneDocumentSummary } from "../_components/milestone-timeline";
import {
  computeCalculatedDeadlines,
  getRequiredCourseworkCreditHours,
  evaluateExtensionThreshold,
  evaluateDegreeTenure,
  countSemestersSinceAdmission,
  ELIGIBILITY_STYLE_MILESTONE_CODES,
  DEADLINE_STATUS_LABELS,
  type DeadlineStatus,
} from "@/lib/academic/progression-rules";

const DEADLINE_TONE: Record<DeadlineStatus, string> = {
  not_applicable: "text-slate-400 dark:text-slate-600",
  not_enough_data: "text-slate-400 dark:text-slate-600",
  not_started: "text-slate-400 dark:text-slate-600",
  on_track: "text-emerald-600 dark:text-emerald-400",
  due_soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
  completed_on_time: "text-emerald-600 dark:text-emerald-400",
  completed_late: "text-amber-600 dark:text-amber-400",
};

/** COURSE_WORK_APPROVAL (MS/M.Phil.) or COURSEWORK (Ph.D., both entry-basis forks) — whichever is applicable to this student. */
const COURSEWORK_DEADLINE_CODES = ["COURSE_WORK_APPROVAL", "COURSEWORK"];

const CURRICULUM_STATUS_LABELS: Record<string, string> = {
  not_configured: "Not configured",
  partially_configured: "Partially configured",
  configured_satisfied: "Satisfied",
  configured_incomplete: "Incomplete",
};

const DEGREE_LEVEL_LABELS: Record<string, string> = { diploma: "Diploma", bachelor: "Bachelor", master: "MS/M.Phil.", phd: "Ph.D." };

function sourceLinkForCode(
  code: string,
  ctx: { studentId: string; researchProjectId: string | null; hasThesis: boolean }
): MilestoneSourceLink | null {
  if (["GSC_PRESENTATION", "ASRB_PRESENTATION", "RESEARCH_TOPIC_PROPOSAL", "CORRECTED_PROPOSAL_SUBMISSION"].includes(code)) {
    return ctx.researchProjectId
      ? { label: "View Research Proposal", href: `/management/research-proposals/${ctx.researchProjectId}` }
      : { label: "Go to Research Proposals", href: "/management/research-proposals" };
  }
  if (
    [
      "THESIS_SUBMISSION",
      "THESIS_REVIEW_EXAMINATION",
      "FOREIGN_NATIONAL_REVIEWER_PROCESS",
      "THESIS_CORRECTIONS",
      "VIVA_VOCE",
      "DEFENCE_VIVA_VOCE",
      "RESULT_DECLARATION",
      "THESIS_RESEARCH_PERIOD",
      "RESEARCH_PERIOD",
    ].includes(code)
  ) {
    return ctx.hasThesis ? { label: "View Thesis Record", href: "/management/thesis" } : { label: "Go to Thesis Records", href: "/management/thesis" };
  }
  if (code === "SUPERVISOR_APPROVAL") return { label: "View Supervisor Assignments", href: "/management/supervisor-assignments" };
  if (code === "EXTENSION_APPLICATION") return { label: "View Extension Applications", href: "/management/extensions" };
  if (["COURSE_WORK", "COURSEWORK", "COURSE_WORK_APPROVAL", "COMPREHENSIVE_EXAMINATION", "COMPREHENSIVE_EXAMINATION_SECOND"].includes(code)) {
    return { label: "Manage Coursework", href: `/management/students/${ctx.studentId}` };
  }
  return null;
}

export default async function StudentAcademicProgressPage(
  props: PageProps<"/management/academic-progress/[studentId]">
) {
  await requireRole("management");

  const { studentId } = await props.params;
  if (!UUID_RE.test(studentId)) notFound();

  // Contextual back-link: any page that links a student into Academic
  // Progress (semester students table, course roster) passes its own
  // backHref/backLabel so the user returns to where they came from rather
  // than always the flat Academic Progress list. Pure presentation — falls
  // back to the list page when absent (e.g. reached directly from there).
  const rawSearchParams = await props.searchParams;
  const rawBackHref = rawSearchParams.backHref;
  const rawBackLabel = rawSearchParams.backLabel;
  const backHref = (Array.isArray(rawBackHref) ? rawBackHref[0] : rawBackHref) || "/management/academic-progress";
  const backLabel = (Array.isArray(rawBackLabel) ? rawBackLabel[0] : rawBackLabel) || "Academic Progress";

  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) notFound();

  const supabase = await createClient();

  const [status, milestones, audit, supervisorHistory, researchProject, thesisRecord, extensions, documentSubmissions, sessions, programDuration, allInstitutionSemesters] =
    await Promise.all([
      getStudentAcademicStatus(studentId),
      getEffectiveMilestonesForStudent(studentId, summary.program.degree_level, summary.program.id, summary.phd_entry_basis),
      getStudentDegreeAudit(studentId),
      getSupervisorAssignmentsForStudent(studentId),
      getResearchProjectForStudent(studentId),
      getThesisRecordForStudent(studentId),
      getExtensionApplicationsForStudent(studentId),
      getDocumentSubmissionsForStudent(studentId),
      getAcademicSessionsOverview(),
      supabase.from("programs").select("duration_years, duration_verified").eq("id", summary.program.id).maybeSingle(),
      // Plain, unfiltered semester calendar for the NCEG semester-ceiling deadline
      // rules below — deliberately NOT getAcademicSessionsOverview(), which only
      // surfaces semesters that have at least one reportable course_offering (it's
      // an offerings-reporting aggregation, not a semester calendar) and would
      // silently drop any semester a student has no enrollment in, undercounting
      // "semesters elapsed" for exactly the students (past coursework, in
      // research/thesis phase) these rules most need to cover.
      supabase.from("semesters").select("academic_year, start_date"),
    ]);

  const [latestProposal, vivaExamination] = await Promise.all([
    researchProject ? getLatestResearchProposal(researchProject.id) : Promise.resolve(null),
    getVivaExaminationForStudent(studentId),
  ]);

  // Milestone -> document-requirement summary, same pattern as the faculty page.
  const milestoneDocSummaries = await Promise.all(
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
      return [m.id, { total: requirements.length, submittedCount, needsCorrection }] as [string, MilestoneDocumentSummary];
    })
  );
  const documentSummaryByMilestone = new Map(milestoneDocSummaries.filter((s): s is [string, MilestoneDocumentSummary] => s !== null));

  // verified_by (profile ids) -> display name, one batched lookup.
  const verifiedByIds = [...new Set(milestones.map((m) => m.record?.verified_by).filter((id): id is string => Boolean(id)))];
  let verifiedByNames = new Map<string, string>();
  if (verifiedByIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", verifiedByIds);
    verifiedByNames = new Map((data ?? []).map((p) => [p.id, p.full_name]));
  }

  const sourceLinkByCode = new Map(
    milestones.map((m) => [m.milestone_code, sourceLinkForCode(m.milestone_code, { studentId, researchProjectId: researchProject?.id ?? null, hasThesis: thesisRecord !== null })])
  ) as Map<string, MilestoneSourceLink>;

  const activeSupervisors = supervisorHistory.filter((a) => a.status === "active" && a.role === "supervisor");
  const activeCoSupervisors = supervisorHistory.filter((a) => a.status === "active" && a.role === "co_supervisor");

  const currentAcademicYear = getCurrentAcademicYear(sessions);
  // Student's own latest semester, from real enrollment data already computed by the degree audit — matched against the institution's semester list rather than a second query.
  const allSemesters = sessions.flatMap((s) => s.semesters.map((sem) => ({ ...sem, academicYear: s.academicYear })));
  const latestSemesterId = audit?.semesterProgress.semesters.at(-1)?.semesterId ?? null;
  const latestSemester = latestSemesterId ? allSemesters.find((s) => s.id === latestSemesterId) : null;

  const durationRow = programDuration.data;
  const expectedCompletion =
    durationRow?.duration_verified && durationRow.duration_years
      ? `${summary.admission_year + Math.ceil(durationRow.duration_years)} (estimated)`
      : null;

  const activeExtension = findActiveExtension(extensions);

  // ---- NCEG progression rules: calculated deadlines, coursework CH policy, extension threshold, degree tenure ----
  const todayIso = new Date().toISOString().slice(0, 10);
  const semesterCalendar = (allInstitutionSemesters.data ?? []).map((s) => ({ academicYear: s.academic_year, startDate: s.start_date }));

  const calculatedDeadlines = computeCalculatedDeadlines(
    milestones,
    { admissionYear: summary.admission_year ?? null, semesters: semesterCalendar },
    todayIso
  );
  const deadlinesByCode = new Map(calculatedDeadlines.map((d) => [d.milestoneCode, d]));
  const courseworkDeadline = COURSEWORK_DEADLINE_CODES.map((c) => deadlinesByCode.get(c)).find((d) => d != null) ?? null;

  const requiredCH = getRequiredCourseworkCreditHours(summary.program.degree_level, summary.phd_entry_basis);
  const completedCH = audit?.creditHourBreakdown.completedCreditHours ?? 0;
  const remainingCH = requiredCH != null ? Math.max(0, requiredCH - completedCH) : null;
  const courseworkProgressPercent = requiredCH ? Math.min(100, Math.round((completedCH / requiredCH) * 100)) : null;

  const semestersElapsedNow = summary.admission_year != null ? countSemestersSinceAdmission(summary.admission_year, semesterCalendar, todayIso) : null;
  const extensionDegreeLevel: "master" | "phd" | null =
    summary.program.degree_level === "master" || summary.program.degree_level === "phd" ? summary.program.degree_level : null;
  const extensionAssessment = extensionDegreeLevel ? evaluateExtensionThreshold(extensionDegreeLevel, semestersElapsedNow, extensions) : null;

  const approvedExtensionSemesters = extensions
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + (e.requested_extension_semesters ?? 0), 0);
  const tenureAssessment = evaluateDegreeTenure(
    summary.admission_year ?? null,
    durationRow?.duration_years ?? null,
    durationRow?.duration_verified ?? false,
    approvedExtensionSemesters
  );

  // Alerts: due-soon/overdue calculated deadlines (excluding the two eligibility-framed milestones, where "overdue" means eligible, not late) + the extension-threshold gap.
  const alerts: { label: string; tone: "warning" | "danger" }[] = [];
  for (const d of calculatedDeadlines) {
    if (ELIGIBILITY_STYLE_MILESTONE_CODES.has(d.milestoneCode)) continue;
    if (d.status === "due_soon") alerts.push({ label: `${d.title} deadline approaching — ${d.basis}`, tone: "warning" });
    if (d.status === "overdue") alerts.push({ label: `${d.title} overdue — ${d.basis}`, tone: "danger" });
  }
  if (extensionAssessment?.alert) {
    alerts.push({
      label: `Extension threshold reached (semester ${extensionAssessment.thresholdSemester}+, currently semester ${extensionAssessment.semestersElapsed}) with no extension application on record`,
      tone: "warning",
    });
  }

  const initials = summary.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const STUDENT_STATUS_TONE: Record<string, "success" | "info" | "danger" | "neutral"> = {
    active: "success",
    graduated: "info",
    inactive: "neutral",
    suspended: "danger",
    withdrawn: "danger",
  };

  const relatedRecordLinks = [
    { label: "Student Profile", href: `/management/students/${studentId}` },
    { label: "Enrollments", href: "/management/enrollments" },
    { label: "Results", href: "/management/results" },
    { label: "Attendance", href: "/management/attendance" },
    { label: "Supervisor Assignments", href: "/management/supervisor-assignments" },
    { label: "Research Proposals", href: "/management/research-proposals" },
    { label: "Documents", href: "/management/documents" },
    { label: "Extensions", href: "/management/extensions" },
    { label: "Thesis", href: "/management/thesis" },
  ];

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-900 hover:underline dark:hover:text-slate-50">
        ← Back to {backLabel}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---- Sidebar: identity → current status → current stage (priority 1-3), plus supervisor/extensions ---- */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SectionCard>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-800 text-base font-semibold text-white dark:bg-brand-600">
                {initials || "?"}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{summary.full_name}</h1>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{summary.student_number}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {status && <StudentStatusBadge statusLabel={status.statusLabel} />}
              <StatusBadge
                label={DEGREE_LEVEL_LABELS[summary.program.degree_level] ?? summary.program.degree_level}
                tone="neutral"
              />
              <StatusBadge
                label={summary.status}
                tone={STUDENT_STATUS_TONE[summary.status] ?? "neutral"}
              />
            </div>
            <dl className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm dark:border-slate-900">
              <DetailRow label="Email" value={summary.email || "Not available"} />
              <DetailRow label="Program" value={summary.program.name} />
              <DetailRow label="Discipline" value={summary.program.department.name} />
              <DetailRow label="Specialization" value={summary.specialization?.name ?? "Not assigned"} />
              <DetailRow label="Admission Year" value={String(summary.admission_year)} />
              <DetailRow label="Current Session" value={currentAcademicYear ?? "Not available"} />
              <DetailRow label="Current Semester" value={latestSemester ? `${latestSemester.name} ${latestSemester.academicYear}` : "Not available"} />
              <DetailRow label="Expected Completion" value={expectedCompletion ?? "Not available"} />
            </dl>
          </SectionCard>

          {status && (
            <SectionCard title="Overall Stage">
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{deriveOverallStage(status)}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Next: {status.nextMilestone?.title ?? status.currentMilestone?.title ?? "No further action required"}
              </p>
              <div className="mt-4">
                <ProgressBar percentage={status.progressPercentage} />
              </div>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                {status.completedMilestones.length} of {status.requiredMilestones.length} required milestones completed
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <MiniStat label="Overdue" value={status.overdueMilestones.length} tone={status.overdueMilestones.length > 0 ? "danger" : "neutral"} />
                <MiniStat label="Due soon" value={status.upcomingDeadlines.length} tone={status.upcomingDeadlines.length > 0 ? "warning" : "neutral"} />
                <MiniStat label="Completed" value={status.completedMilestones.length} tone="success" />
                <MiniStat label="Extension" value={status.extensionStatus.active ? "Active" : "None"} tone={status.extensionStatus.active ? "info" : "neutral"} />
              </div>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400 dark:border-slate-900 dark:text-slate-600">
                Est. degree tenure end: {tenureAssessment.estimatedTenureEndYear ?? "Not enough data"}
                {tenureAssessment.status === "estimated" ? " (estimated)" : ""}
                <span className="mt-1 block">{tenureAssessment.note}</span>
              </p>
            </SectionCard>
          )}

          <SectionCard title="Supervisor">
            {activeSupervisors.length === 0 && activeCoSupervisors.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No supervisor currently assigned.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {activeSupervisors.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{a.faculty.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Supervisor · since {formatAcademicDate(a.assigned_date)}</p>
                  </li>
                ))}
                {activeCoSupervisors.map((a) => (
                  <li key={a.id}>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{a.faculty.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Co-Supervisor · since {formatAcademicDate(a.assigned_date)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/management/supervisor-assignments" className="mt-4 inline-block text-xs text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
              View Supervisor Assignments →
            </Link>
          </SectionCard>

          <SectionCard title="Extensions">
            {extensionAssessment && (
              <p className={`text-xs ${extensionAssessment.alert ? "font-medium text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600"}`}>
                {extensionAssessment.semestersElapsed == null
                  ? "Not enough data to determine semesters completed."
                  : `Semester ${extensionAssessment.semestersElapsed} of ${extensionAssessment.thresholdSemester} (extension threshold)${extensionAssessment.thresholdReached ? (extensionAssessment.hasAnyExtensionRecord ? " — threshold reached" : " — threshold reached, no application on record") : ""}.`}
              </p>
            )}
            {extensions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No extension applications on record.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {extensions.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        label={e.status}
                        tone={e.status === "approved" ? "success" : e.status === "rejected" ? "danger" : "info"}
                      />
                      {e.requested_from && e.requested_to && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatAcademicDate(e.requested_from)} – {formatAcademicDate(e.requested_to)}
                        </span>
                      )}
                    </span>
                    {activeExtension?.id === e.id && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Active</span>}
                  </li>
                ))}
              </ul>
            )}
            <Link href="/management/extensions" className="mt-4 inline-block text-xs text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
              View Extension Applications →
            </Link>
          </SectionCard>
        </aside>

        {/* ---- Main column: alerts → milestone timeline (priority 4) → coursework (priority 5) → research/thesis (priority 6) → links (priority 7) ---- */}
        <div className="space-y-6">
          {alerts.length > 0 && (
            <SectionCard>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900 dark:text-amber-300">!</span>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Alerts ({alerts.length})
                </p>
              </div>
              <ul className="mt-3 space-y-2">
                {alerts.map((a, i) => (
                  <li
                    key={i}
                    className={`rounded-md border-l-2 py-1 pl-3 text-sm ${
                      a.tone === "danger"
                        ? "border-red-400 text-red-700 dark:border-red-700 dark:text-red-400"
                        : "border-amber-400 text-amber-800 dark:border-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {a.label}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <SectionHeading title="Milestone Timeline" count={milestones.length} />
              <Link
                href="/management/milestones"
                className="text-xs text-slate-400 underline hover:text-slate-700 dark:text-slate-600 dark:hover:text-slate-300"
              >
                Manage Milestone Templates →
              </Link>
            </div>
            <MilestoneTimeline
              studentId={studentId}
              milestones={milestones}
              documentSummaryByMilestone={documentSummaryByMilestone}
              verifiedByNames={verifiedByNames}
              sourceLinkByCode={sourceLinkByCode}
              deadlinesByCode={deadlinesByCode}
            />
          </section>

          <section className="space-y-3">
            <SectionHeading title="Coursework Progress" />
            {audit ? (
              <SectionCard>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
                      {completedCH}
                      <span className="text-lg font-normal text-slate-400 dark:text-slate-600"> / {requiredCH ?? "?"} CH</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {requiredCH != null ? "against the NCEG coursework requirement" : "NCEG requirement unavailable — see note below"}
                    </p>
                  </div>
                  {courseworkDeadline && courseworkDeadline.status !== "not_applicable" && (
                    <p className={`text-right text-sm font-medium ${DEADLINE_TONE[courseworkDeadline.status]}`}>
                      {DEADLINE_STATUS_LABELS[courseworkDeadline.status]}
                      <span className="mt-0.5 block text-xs font-normal text-slate-400 dark:text-slate-600">{courseworkDeadline.basis}</span>
                    </p>
                  )}
                </div>
                {courseworkProgressPercent != null && (
                  <div className="mt-3">
                    <ProgressBar percentage={courseworkProgressPercent} label={`${courseworkProgressPercent}% of required coursework credit hours complete`} />
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
                  <MiniStat label="Remaining CH" value={remainingCH ?? "—"} />
                  <MiniStat label="In-Progress CH" value={audit.creditHourBreakdown.inProgressCreditHours} tone={audit.creditHourBreakdown.inProgressCreditHours > 0 ? "info" : "neutral"} />
                  <MiniStat label="Failed CH" value={audit.creditHourBreakdown.failedCreditHours} tone={audit.creditHourBreakdown.failedCreditHours > 0 ? "danger" : "neutral"} />
                  <MiniStat label="Semesters Enrolled" value={audit.semesterProgress.distinctSemestersEnrolled} />
                  <MiniStat label="CGPA" value={audit.cgpa.gpa ?? "—"} />
                  <MiniStat label="Curriculum" value={CURRICULUM_STATUS_LABELS[audit.curriculumStatus]} />
                </div>

                {requiredCH == null && summary.program.degree_level === "phd" && (
                  <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
                    Required CH not available — Ph.D. coursework requirement (24 vs 48 CH) depends on entry basis (MS/M.Phil./LLM vs BS/Master), which is not recorded for this student.
                  </p>
                )}
                {audit.totalRequiredCreditHours != null && requiredCH != null && audit.totalRequiredCreditHours !== requiredCH && (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
                    Category-level quotas in Curriculum Requirements currently total {audit.totalRequiredCreditHours} CH, which does not match the NCEG {requiredCH} CH figure above; see the phase report.
                  </p>
                )}
                {audit.missingMandatoryCourses.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Missing mandatory courses: {audit.missingMandatoryCourses.map((c) => c.code).join(", ")}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm dark:border-slate-900">
                  <Link href={`/management/students/${studentId}`} className="text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                    View Enrollments / Sync Coursework →
                  </Link>
                  <Link href={`/management/results`} className="text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                    View Results →
                  </Link>
                  <Link href="/management/curriculum-requirements" className="text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                    Curriculum Requirements →
                  </Link>
                </div>
              </SectionCard>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Coursework information is not available for this student.</p>
            )}
          </section>

          {(researchProject || thesisRecord) && (
            <section className="space-y-3">
              <SectionHeading title="Research & Thesis Summary" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {researchProject && (
                  <SectionCard title="Research Proposal">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{researchProject.title}</p>
                    {researchProject.research_area && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{researchProject.research_area}</p>}
                    {latestProposal && (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">GSC: </span>
                          {latestProposal.gsc_status ? <MilestoneStatusBadge status={latestProposal.gsc_status} /> : "—"}
                        </div>
                        <div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">ASRB: </span>
                          {latestProposal.asrb_status ? <MilestoneStatusBadge status={latestProposal.asrb_status} /> : "—"}
                        </div>
                        <Field label="Approval Date" value={formatAcademicDate(latestProposal.approval_date)} />
                        <Field label="Version" value={String(latestProposal.version)} />
                      </div>
                    )}
                    <Link href={`/management/research-proposals/${researchProject.id}`} className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                      View Research Proposal →
                    </Link>
                  </SectionCard>
                )}
                {thesisRecord && (
                  <SectionCard title="Thesis">
                    <p className="font-medium text-slate-900 dark:text-slate-50">{thesisRecord.thesis_title ?? "Untitled"}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <Field label="Submission Date" value={formatAcademicDate(thesisRecord.submission_date)} />
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Status: </span>
                        {thesisRecord.status ? <MilestoneStatusBadge status={thesisRecord.status} /> : "—"}
                      </div>
                      <Field label="Clearance" value={thesisRecord.clearance_status ?? "Not available"} />
                      <Field
                        label="Defense/Viva"
                        value={vivaExamination ? `${vivaExamination.status ?? "—"}${vivaExamination.actual_date ? ` (${formatAcademicDate(vivaExamination.actual_date)})` : ""}` : "Not scheduled"}
                      />
                    </div>
                    <Link href={`/management/thesis/${thesisRecord.id}`} className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50">
                      View Thesis Record →
                    </Link>
                  </SectionCard>
                )}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <SectionHeading title="Related Records" />
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              {relatedRecordLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-50"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
      {title && <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>}
      {children}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
      {title}
      {count != null && <span className="ml-1.5 text-slate-400 dark:text-slate-600">({count})</span>}
    </h2>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="truncate text-right text-slate-900 dark:text-slate-50" title={value}>
        {value}
      </dd>
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

const MINI_STAT_TONE_CLASSES: Record<"neutral" | "success" | "warning" | "danger" | "info", string> = {
  neutral: "text-slate-900 dark:text-slate-50",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

function MiniStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`truncate text-lg font-semibold capitalize ${MINI_STAT_TONE_CLASSES[tone]}`} title={String(value)}>
        {value}
      </p>
    </div>
  );
}
