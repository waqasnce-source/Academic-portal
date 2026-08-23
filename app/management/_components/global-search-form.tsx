/**
 * Minimal management-wide search — a plain GET form (no client JS needed)
 * submitting to /management/search. See lib/management/search.ts for the
 * (intentionally small, bounded) query logic.
 */
export function GlobalSearchForm() {
  return (
    <form action="/management/search" method="GET" className="w-full max-w-xs">
      <label htmlFor="global-search" className="sr-only">
        Search students, faculty, courses…
      </label>
      <input
        id="global-search"
        name="q"
        type="search"
        placeholder="Search students, faculty, courses…"
        className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:text-slate-50"
      />
    </form>
  );
}
