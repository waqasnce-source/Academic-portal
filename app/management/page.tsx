import { requireRole } from "@/lib/supabase/dal";
import { getManagementOverviewStats } from "@/lib/management/stats";

export default async function ManagementOverviewPage() {
  await requireRole("management");
  const stats = await getManagementOverviewStats();

  const tiles: { label: string; value: number }[] = [
    { label: "Active students", value: stats.activeStudents },
    { label: "Active faculty", value: stats.activeFaculty },
    { label: "Departments", value: stats.activeDepartments },
    { label: "Programs", value: stats.activePrograms },
    { label: "Courses", value: stats.activeCourses },
    { label: "Open course offerings", value: stats.openCourseOfferings },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Overview
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Institution-wide snapshot.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tile.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {tile.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
