import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import {
  getResearchProjects,
  hasActiveResearchProjectFilters,
  parseResearchProjectFilters,
  RESEARCH_PROJECTS_PAGE_SIZE,
} from "@/lib/management/research-proposals";
import { ErrorBanner } from "@/app/management/_components/error-banner";
import { ResearchProjectFiltersForm } from "./_components/research-project-filters-form";
import { ResearchProjectsTable } from "./_components/research-projects-table";
import { ResearchProjectsPagination } from "./_components/research-projects-pagination";

export default async function ManagementResearchProposalsPage(
  props: PageProps<"/management/research-proposals">
) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseResearchProjectFilters(rawSearchParams);

  const { data: projects, count, page, error } = await getResearchProjects(filters);
  const totalPages = Math.max(1, Math.ceil(count / RESEARCH_PROJECTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            GSC/ASRB Research Proposals
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error ? "—" : `${count.toLocaleString()} research project${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/research-proposals/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Research Project
        </Link>
      </div>

      <ResearchProjectFiltersForm filters={filters} />

      {error ? (
        <ErrorBanner message={error} />
      ) : (
        <>
          <ResearchProjectsTable projects={projects} hasActiveFilters={hasActiveResearchProjectFilters(filters)} />
          {count > 0 && <ResearchProjectsPagination filters={filters} page={page} totalPages={totalPages} />}
        </>
      )}
    </div>
  );
}
