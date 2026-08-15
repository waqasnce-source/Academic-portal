import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";

const REPORTS = [
  {
    slug: "headcount",
    label: "Institution Headcount Summary",
    description: "Total user accounts, broken down by role and status.",
  },
  {
    slug: "enrollment-capacity",
    label: "Enrollment Headcount & Capacity Utilization",
    description: "Enrolled counts vs. capacity for each course offering.",
  },
  {
    slug: "teaching-load",
    label: "Faculty Teaching Load",
    description: "Offerings taught and total credit hours per faculty member.",
  },
  {
    slug: "attendance-rate",
    label: "Attendance Rate by Offering",
    description: "Present/absent/late/excused breakdown per course offering.",
  },
  {
    slug: "results-publication",
    label: "Results Publication Status Summary",
    description: "How many recorded results are published vs. unpublished.",
  },
] as const;

export default async function ReportsIndexPage() {
  await requireRole("management");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Institution-wide reports, computed from existing academic data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            key={report.slug}
            href={`/management/reports/${report.slug}`}
            className="rounded-lg border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{report.label}</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
