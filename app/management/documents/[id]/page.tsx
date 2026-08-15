import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getDocumentSubmissionById, getDocumentSubmissionVersions } from "@/lib/management/documents";
import { getSignedDocumentUrl } from "@/lib/academic/documents";
import { UUID_RE } from "@/lib/management/query-params";
import { MilestoneStatusBadge, formatAcademicDate } from "@/app/_components/academic-status";
import { DocumentReviewForm } from "./_components/document-review-form";

export default async function ManagementDocumentReviewPage(
  props: PageProps<"/management/documents/[id]">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const submission = await getDocumentSubmissionById(id);
  if (!submission) notFound();

  const versions = await getDocumentSubmissionVersions(submission.student_id, submission.document_requirement_id);
  const versionsWithUrls = await Promise.all(
    versions.map(async (v) => ({ version: v, url: await getSignedDocumentUrl(v.file_path) }))
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/documents" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Documents
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {submission.requirement.document_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {submission.student.profile?.full_name ?? submission.student.student_number} · v{submission.version}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Status" value={submission.status.replace(/_/g, " ")} />
        <Field label="Submitted" value={formatAcademicDate(submission.submitted_at)} />
        <Field label="Reviewed" value={formatAcademicDate(submission.verified_at)} />
        <Field label="Required" value={submission.requirement.required ? "Yes" : "Optional"} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">All Versions ({versions.length})</h2>
        <ul className="space-y-2">
          {versionsWithUrls.map(({ version: v, url }) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 px-4 py-2.5 text-sm dark:border-zinc-800"
            >
              <span className="text-zinc-700 dark:text-zinc-300">
                v{v.version} — {formatAcademicDate(v.submitted_at)}
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-zinc-500 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    {v.original_filename}
                  </a>
                ) : (
                  <span className="ml-2 text-zinc-400 dark:text-zinc-600">{v.original_filename}</span>
                )}
              </span>
              <div className="flex items-center gap-3">
                {v.remarks && <span className="text-xs text-zinc-500 dark:text-zinc-400">&quot;{v.remarks}&quot;</span>}
                <MilestoneStatusBadge status={v.status} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Review v{submission.version}
        </h2>
        <DocumentReviewForm submissionId={submission.id} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm capitalize text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
