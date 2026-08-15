export default function ProgramsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
      <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}
