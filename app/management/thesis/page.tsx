import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getThesisRecords } from "@/lib/management/thesis";
import { ThesisRecordsTable } from "./_components/thesis-records-table";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementThesisPage() {
  await requireRole("management");

  const { data: records, count, error } = await getThesisRecords();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Thesis Records</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error ? "—" : `${count.toLocaleString()} thesis record${count === 1 ? "" : "s"} found`}
          </p>
        </div>
        <Link
          href="/management/thesis/new"
          className="shrink-0 rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          Create Thesis Record
        </Link>
      </div>

      {error ? <ErrorBanner message={error} /> : <ThesisRecordsTable records={records} />}
    </div>
  );
}
