import Link from "next/link";
import type { ResearchProjectListRow } from "@/lib/management/research-proposals";
import { EmptyState } from "@/app/management/_components/empty-state";

export function ResearchProjectsTable({
  projects,
  hasActiveFilters,
}: {
  projects: ResearchProjectListRow[];
  hasActiveFilters: boolean;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="research projects"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/research-proposals"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Title</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Research Area</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Supervisor</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {projects.map((p) => (
            <tr key={p.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {p.student.name} ({p.student.student_number})
              </td>
              <td className="max-w-xs truncate px-4 py-2.5 text-slate-700 dark:text-slate-300">{p.title}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {p.research_area ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {p.supervisor?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{p.status ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                  href={`/management/research-proposals/${p.id}`}
                  className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
