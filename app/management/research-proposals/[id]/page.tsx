import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  getResearchProjectDetail,
  getResearchProposalsForProject,
  getReviewerNames,
  getFacultyOptions,
} from "@/lib/management/research-proposals";
import { getDocumentSubmissionsForStudent } from "@/lib/academic/documents";
import { UUID_RE } from "@/lib/management/query-params";
import { formatAcademicDate, MilestoneStatusBadge } from "@/app/_components/academic-status";
import { ResearchProjectEditForm } from "../_components/research-project-edit-form";
import { ProposalStageReviewForm } from "../_components/proposal-stage-review-form";
import { ProposalDatesForm } from "../_components/proposal-dates-form";
import { NewProposalVersionForm } from "../_components/new-proposal-version-form";
import type { StudentMilestoneStatus } from "@/lib/academic/status-enums";

export default async function ManagementResearchProposalDetailPage(
  props: PageProps<"/management/research-proposals/[id]">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const project = await getResearchProjectDetail(id);
  if (!project) notFound();

  const [proposals, faculty, documents] = await Promise.all([
    getResearchProposalsForProject(id),
    getFacultyOptions(),
    getDocumentSubmissionsForStudent(project.student.id),
  ]);
  const reviewerNames = await getReviewerNames(proposals);

  const latest = proposals[0] ?? null;
  const nextVersion = (latest?.version ?? 0) + 1;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/management/research-proposals"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← GSC/ASRB Research Proposals
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">{project.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <Link
            href={`/management/students/${project.student.id}`}
            className="underline hover:text-slate-900 dark:hover:text-slate-50"
          >
            {project.student.name} ({project.student.student_number})
          </Link>
          {project.student.program && ` — ${project.student.program.degree_level.toUpperCase()}`}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Project</h2>
        <ResearchProjectEditForm
          projectId={project.id}
          studentId={project.student.id}
          faculty={faculty}
          defaultValues={{
            title: project.title,
            abstract: project.abstract,
            research_area: project.research_area,
            supervisor_id: project.supervisor?.id ?? null,
            status: project.status,
          }}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Proposal Versions ({proposals.length})</h2>

        {proposals.map((p) => {
          const isLatest = p.id === latest?.id;
          return (
            <div key={p.id} className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  Version {p.version} {isLatest && <span className="text-xs text-slate-500 dark:text-slate-400">(current)</span>}
                </p>
              </div>
              {p.remarks && <p className="text-sm text-slate-600 dark:text-slate-400">{p.remarks}</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StageSummary
                  label="GSC"
                  status={p.gsc_status}
                  date={p.gsc_date}
                  comments={p.gsc_comments}
                  reviewedBy={p.gsc_reviewed_by ? reviewerNames.get(p.gsc_reviewed_by) ?? null : null}
                />
                <StageSummary
                  label="ASRB"
                  status={p.asrb_status}
                  date={p.asrb_date}
                  comments={p.asrb_comments}
                  reviewedBy={p.asrb_reviewed_by ? reviewerNames.get(p.asrb_reviewed_by) ?? null : null}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Corrected Proposal Submitted
                  </p>
                  <p className="mt-1 text-slate-900 dark:text-slate-50">{formatAcademicDate(p.corrected_submission_date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Approved</p>
                  <p className="mt-1 text-slate-900 dark:text-slate-50">{formatAcademicDate(p.approval_date)}</p>
                </div>
              </div>

              {isLatest && (
                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 lg:grid-cols-3">
                  <ProposalStageReviewForm
                    proposalId={p.id}
                    studentId={project.student.id}
                    projectId={project.id}
                    stage="gsc"
                    currentStatus={p.gsc_status}
                  />
                  <ProposalStageReviewForm
                    proposalId={p.id}
                    studentId={project.student.id}
                    projectId={project.id}
                    stage="asrb"
                    currentStatus={p.asrb_status}
                  />
                  <ProposalDatesForm
                    proposalId={p.id}
                    studentId={project.student.id}
                    projectId={project.id}
                    defaultValues={{
                      corrected_submission_date: p.corrected_submission_date,
                      approval_date: p.approval_date,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        <NewProposalVersionForm projectId={project.id} nextVersion={nextVersion} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Related Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No documents submitted yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {d.requirement?.document_name ?? "Document"} (v{d.version}) — {formatAcademicDate(d.submitted_at)}
                </span>
                <span className="flex items-center gap-2">
                  <MilestoneStatusBadge status={d.status} />
                  <Link
                    href={`/management/documents/${d.id}`}
                    className="text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                  >
                    Review
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StageSummary({
  label,
  status,
  date,
  comments,
  reviewedBy,
}: {
  label: string;
  status: string | null;
  date: string | null;
  comments: string | null;
  reviewedBy: string | null;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {status ? <MilestoneStatusBadge status={status as StudentMilestoneStatus} /> : <span className="text-xs text-slate-400">—</span>}
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{formatAcademicDate(date)}</p>
      {comments && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{comments}</p>}
      {reviewedBy && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Reviewed by {reviewedBy}</p>}
    </div>
  );
}
