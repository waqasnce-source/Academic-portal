import type { DocumentRequirementRow } from "@/lib/management/documents";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

export function DocumentRequirementsTable({ requirements }: { requirements: DocumentRequirementRow[] }) {
  if (requirements.length === 0) {
    return <EmptyState entityLabelPlural="document requirements" hasActiveFilters={false} clearHref="/management/documents" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Document</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Required For</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Required</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {requirements.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">{r.document_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {r.milestone?.title ?? r.program?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 capitalize dark:text-slate-400">
                {r.milestone?.degree_level ?? r.degree_level ?? "Any"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={r.required ? "required" : "optional"} tone={r.required ? "info" : "neutral"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
