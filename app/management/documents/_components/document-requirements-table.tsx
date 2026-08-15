import type { DocumentRequirementRow } from "@/lib/management/documents";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

export function DocumentRequirementsTable({ requirements }: { requirements: DocumentRequirementRow[] }) {
  if (requirements.length === 0) {
    return <EmptyState entityLabelPlural="document requirements" hasActiveFilters={false} clearHref="/management/documents" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Document</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Required For</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Degree</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Required</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {requirements.map((r) => (
            <tr key={r.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-50">{r.document_name}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-700 dark:text-zinc-300">
                {r.milestone?.title ?? r.program?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 capitalize dark:text-zinc-400">
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
