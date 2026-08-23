export default function FacultyHubLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-slate-100 dark:bg-slate-900" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
