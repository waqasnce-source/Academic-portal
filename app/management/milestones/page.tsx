import { requireRole } from "@/lib/supabase/dal";
import {
  getMilestoneTemplates,
  hasActiveMilestoneTemplateFilters,
  parseMilestoneTemplateFilters,
} from "@/lib/management/milestones";
import { MilestoneFiltersForm } from "./_components/milestone-filters-form";
import { MilestoneTemplatesTable } from "./_components/milestone-templates-table";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementMilestonesPage(
  props: PageProps<"/management/milestones">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseMilestoneTemplateFilters(rawSearchParams);

  const { data: templates, error } = await getMilestoneTemplates(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Milestone Templates
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {error ? "—" : `${templates.length.toLocaleString()} template${templates.length === 1 ? "" : "s"} — the configurable MS/MPhil and PhD degree-completion roadmap`}
        </p>
      </div>

      <MilestoneFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <MilestoneTemplatesTable
          templates={templates}
          hasActiveFilters={hasActiveMilestoneTemplateFilters(filters)}
        />
      )}
    </div>
  );
}
