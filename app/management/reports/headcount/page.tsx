import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getHeadcountSummary } from "@/lib/management/reports/headcount";
import { ErrorBanner } from "@/app/management/_components/error-banner";

const ROLE_LABELS: Record<string, string> = {
  student: "Students",
  faculty: "Faculty",
  management: "Management",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export default async function HeadcountReportPage() {
  await requireRole("management");
  const summary = await getHeadcountSummary();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/reports"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Institution Headcount Summary
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Total user accounts, broken down by role and status.
        </p>
      </div>

      {summary.error ? (
        <ErrorBanner message={summary.error} />
      ) : (
        <div className="space-y-8">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total users</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
              {summary.total.toLocaleString()}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">By role</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {summary.byRole.map((r) => (
                <div
                  key={r.role}
                  className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{ROLE_LABELS[r.role]}</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {r.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">By status</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {summary.byStatus.map((s) => (
                <div
                  key={s.status}
                  className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{STATUS_LABELS[s.status]}</p>
                  <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {s.count.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
