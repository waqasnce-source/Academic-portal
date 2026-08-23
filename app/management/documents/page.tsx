import { requireRole } from "@/lib/supabase/dal";
import { getDocumentRequirements, getRecentDocumentSubmissions } from "@/lib/management/documents";
import { DocumentRequirementsTable } from "./_components/document-requirements-table";
import { DocumentSubmissionsTable } from "./_components/document-submissions-table";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementDocumentsPage() {
  await requireRole("management");

  const [{ data: requirements, error: requirementsError }, { data: submissions, error: submissionsError }] =
    await Promise.all([getDocumentRequirements(), getRecentDocumentSubmissions()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Documents</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configured document requirements and recent student submissions.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Document Requirements ({requirements.length})
        </h2>
        {requirementsError ? (
          <ErrorBanner message={requirementsError} />
        ) : (
          <DocumentRequirementsTable requirements={requirements} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Recent Submissions ({submissions.length})
        </h2>
        {submissionsError ? (
          <ErrorBanner message={submissionsError} />
        ) : (
          <DocumentSubmissionsTable submissions={submissions} />
        )}
      </section>
    </div>
  );
}
