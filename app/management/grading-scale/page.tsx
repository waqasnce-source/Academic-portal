import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getGradingScale } from "@/lib/management/grading-scale";
import { GradingScaleTable } from "./_components/grading-scale-table";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementGradingScalePage() {
  await requireRole("management");

  const { data: bands, error } = await getGradingScale();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Grading Scale</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {error ? "—" : `${bands.length} band${bands.length === 1 ? "" : "s"} configured`}
          </p>
          <p className="mt-1 max-w-2xl text-xs text-zinc-500 dark:text-zinc-400">
            No institutional grading scale is pre-configured. Add bands only once the actual University of
            Peshawar / NCEG grading policy has been confirmed — do not assume a generic scale.
          </p>
        </div>
        <Link
          href="/management/grading-scale/new"
          className="shrink-0 rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add Band
        </Link>
      </div>

      {error ? <ErrorBanner message={error} /> : <GradingScaleTable bands={bands} />}
    </div>
  );
}
