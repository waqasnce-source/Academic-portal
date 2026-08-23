import type { MilestoneTemplateRow } from "@/lib/management/milestones";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";

const ENTRY_BASIS_LABELS: Record<string, string> = {
  ms_mphil_llm: "MS/MPhil/LLM entry",
  bs_master: "BS/Master entry",
};

function formatTarget(row: MilestoneTemplateRow): string {
  const parts: string[] = [];
  if (row.target_semester) parts.push(`by sem. ${row.target_semester}`);
  if (row.target_days_after_admission) parts.push(`${row.target_days_after_admission}d after admission`);
  if (row.target_days_after_prerequisite) parts.push(`${row.target_days_after_prerequisite}d after prerequisite`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function MilestoneTemplatesTable({
  templates,
  hasActiveFilters,
}: {
  templates: MilestoneTemplateRow[];
  hasActiveFilters: boolean;
}) {
  if (templates.length === 0) {
    return (
      <EmptyState entityLabelPlural="milestone templates" hasActiveFilters={hasActiveFilters} clearHref="/management/milestones" />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">#</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Degree</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Entry Basis</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Category</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Target</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Required</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {templates.map((t) => (
            <tr key={t.id}>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{t.sequence_no}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 capitalize dark:text-slate-300">{t.degree_level}</td>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">{t.title}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {t.applicable_entry_basis ? ENTRY_BASIS_LABELS[t.applicable_entry_basis] : "Any"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{t.category ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{formatTarget(t)}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={t.required ? "required" : "optional"} tone={t.required ? "info" : "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={t.is_active ? "active" : "inactive"} tone={t.is_active ? "success" : "neutral"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
