import { requireRole } from "@/lib/supabase/dal";
import { getAcademicProgressOverview } from "@/lib/management/academic-progress";
import { ProgressOverviewTable } from "./_components/progress-overview-table";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementAcademicProgressPage() {
  await requireRole("management");

  const overview = await getAcademicProgressOverview();

  const tiles: { label: string; value: number }[] = [
    { label: "Active students", value: overview.totalStudents },
    { label: "On track", value: overview.byStatusLabel.ON_TRACK },
    { label: "Due soon", value: overview.byStatusLabel.DUE_SOON },
    { label: "Delayed", value: overview.byStatusLabel.DELAYED },
    { label: "Extended", value: overview.byStatusLabel.EXTENDED },
    { label: "Completed", value: overview.byStatusLabel.COMPLETED },
    { label: "On hold", value: overview.byStatusLabel.ON_HOLD },
    { label: "Requiring action", value: overview.requiringAction },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Academic Progress Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Institution-wide academic status, computed live from milestone records — nothing here is stored.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{tile.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {overview.error ? <ErrorBanner message={overview.error} /> : <ProgressOverviewTable students={overview.students} />}
    </div>
  );
}
