export default function ManagementOverviewLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-96 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
