import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getExtensionApplicationById } from "@/lib/management/extensions";
import { UUID_RE } from "@/lib/management/query-params";
import { formatAcademicDate } from "@/app/_components/academic-status";
import { ExtensionReviewForm } from "../_components/extension-review-form";

export default async function ManagementExtensionDetailPage(
  props: PageProps<"/management/extensions/[id]">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const application = await getExtensionApplicationById(id);
  if (!application) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/extensions" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Extension Applications
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {application.student.profile?.full_name ?? application.student.name}
        </h1>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Application Date" value={formatAcademicDate(application.application_date)} />
        <Field label="Current Semester" value={application.current_semester != null ? String(application.current_semester) : "—"} />
        <Field label="Requested Semesters" value={application.requested_extension_semesters != null ? String(application.requested_extension_semesters) : "—"} />
        <Field label="Requested From" value={formatAcademicDate(application.requested_from)} />
        <Field label="Requested To" value={formatAcademicDate(application.requested_to)} />
        <Field label="Approval Date" value={formatAcademicDate(application.approval_date)} />
      </section>

      {application.reason && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reason</h2>
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {application.reason}
          </p>
        </section>
      )}

      {(application.recommendation || application.remarks) && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prior Review Notes</h2>
          {application.recommendation && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium">Recommendation: </span>
              {application.recommendation}
            </p>
          )}
          {application.remarks && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-medium">Remarks: </span>
              {application.remarks}
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Review</h2>
        <ExtensionReviewForm applicationId={application.id} currentStatus={application.status} />
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
