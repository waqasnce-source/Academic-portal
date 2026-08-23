/** Shared loading skeleton for modules built from Semesters onward. */
export function ManagementListLoading({ titleWidth = "w-48" }: { titleWidth?: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className={`h-7 ${titleWidth} animate-pulse rounded bg-slate-200 dark:bg-slate-800`} />
        <div className="h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
