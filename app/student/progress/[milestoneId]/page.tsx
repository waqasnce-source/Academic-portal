import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentStudentId, getStudentProfileSummary } from "@/lib/academic/identity";
import { getEffectiveMilestonesForStudent } from "@/lib/academic/milestones";
import {
  getDocumentRequirementsForMilestone,
  getDocumentSubmissionsForStudent,
  getSignedDocumentUrl,
} from "@/lib/academic/documents";
import { UUID_RE } from "@/lib/management/query-params";
import { MilestoneStatusBadge, formatAcademicDate } from "@/app/_components/academic-status";
import { DocumentUploadForm } from "./_components/document-upload-form";

export default async function StudentMilestoneDetailPage(
  props: PageProps<"/student/progress/[milestoneId]">
) {
  const profile = await requireRole("student");
  const studentId = await getCurrentStudentId(profile.id);
  if (!studentId) notFound();

  const { milestoneId } = await props.params;
  if (!UUID_RE.test(milestoneId)) notFound();

  const summary = await getStudentProfileSummary(studentId);
  if (!summary || !summary.program) notFound();

  const [milestones, requirements, submissions] = await Promise.all([
    getEffectiveMilestonesForStudent(
      studentId,
      summary.program.degree_level,
      summary.program.id,
      summary.phd_entry_basis
    ),
    getDocumentRequirementsForMilestone(milestoneId),
    getDocumentSubmissionsForStudent(studentId),
  ]);

  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) notFound();

  const requirementIds = new Set(requirements.map((r) => r.id));
  const relevantSubmissions = submissions.filter(
    (s) => requirementIds.has(s.document_requirement_id) || (milestone.record && s.milestone_id === milestone.record.id)
  );

  const historyEvents: { label: string; date: string }[] = [];
  if (milestone.record?.planned_date) historyEvents.push({ label: "Planned", date: milestone.record.planned_date });
  if (milestone.record?.due_date) historyEvents.push({ label: "Due", date: milestone.record.due_date });
  if (milestone.record?.completed_date) historyEvents.push({ label: "Completed", date: milestone.record.completed_date });
  if (milestone.record?.verified_date) historyEvents.push({ label: "Verified", date: milestone.record.verified_date });
  historyEvents.sort((a, b) => a.date.localeCompare(b.date));

  // Precomputed (rather than awaited inline in JSX) so the render below stays synchronous.
  const requirementCards = await Promise.all(
    requirements.map(async (r) => {
      const versions = relevantSubmissions
        .filter((s) => s.document_requirement_id === r.id)
        .sort((a, b) => b.version - a.version);
      const versionsWithUrls = await Promise.all(
        versions.map(async (v) => ({ submission: v, url: await getSignedDocumentUrl(v.file_path) }))
      );
      const latest = versions[0] ?? null;
      return {
        requirement: r,
        versionsWithUrls,
        latest,
        nextVersion: (versions[0]?.version ?? 0) + 1,
        needsAction: latest?.status === "corrections_required",
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/student/progress"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Academic Progress
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Step {milestone.sequence_no}
              {milestone.category ? ` · ${milestone.category}` : ""}
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{milestone.title}</h1>
          </div>
          <MilestoneStatusBadge status={milestone.status} />
        </div>
      </div>

      {milestone.description && (
        <p className="text-sm text-slate-700 dark:text-slate-300">{milestone.description}</p>
      )}

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Required" value={milestone.required ? "Yes" : "Optional"} />
        <Field label="Expected Semester" value={milestone.target_semester ? String(milestone.target_semester) : "—"} />
        <Field label="Due Date" value={formatAcademicDate(milestone.record?.due_date)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Dates</h2>
        {historyEvents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No dates recorded yet for this milestone.</p>
        ) : (
          <ol className="space-y-2">
            {historyEvents.map((e) => (
              <li
                key={e.label}
                className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-300">{e.label}</span>
                <span className="text-slate-500 dark:text-slate-400">{formatAcademicDate(e.date)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Comments</h2>
        {milestone.record?.remarks ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {milestone.record.remarks}
          </p>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No comments recorded yet.</p>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Required Documents ({requirements.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Document status is tracked separately from the milestone status above — a milestone can remain
            &quot;in progress&quot; while an individual document is corrected and resubmitted.
          </p>
        </div>

        {requirementCards.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No documents are configured for this milestone.</p>
        ) : (
          <div className="space-y-4">
            {requirementCards.map(({ requirement: r, versionsWithUrls, latest, nextVersion, needsAction }) => (
              <div
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{r.document_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.required ? "Required" : "Optional"}
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  {latest ? (
                    <MilestoneStatusBadge status={latest.status} />
                  ) : (
                    <span className="text-sm text-slate-400 dark:text-slate-600">Not submitted</span>
                  )}
                </div>

                {needsAction && latest?.remarks && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
                    <span className="font-medium">Correction requested: </span>
                    {latest.remarks}
                  </div>
                )}

                {versionsWithUrls.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {versionsWithUrls.map(({ submission: v, url }) => (
                      <li
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-1.5 text-sm dark:border-slate-900"
                      >
                        <span className="text-slate-700 dark:text-slate-300">
                          v{v.version} — {formatAcademicDate(v.submitted_at)}
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                            >
                              {v.original_filename}
                            </a>
                          ) : (
                            <span className="ml-2 text-slate-400 dark:text-slate-600">{v.original_filename}</span>
                          )}
                        </span>
                        <MilestoneStatusBadge status={v.status} />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-900">
                  <DocumentUploadForm
                    studentId={studentId}
                    documentRequirementId={r.id}
                    milestoneRecordId={milestone.record?.id ?? null}
                    nextVersion={nextVersion}
                  />
                </div>
              </div>
            ))}
          </div>
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
