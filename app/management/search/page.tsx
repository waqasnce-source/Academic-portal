import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { runManagementSearch, type SearchResultItem } from "@/lib/management/search";

export default async function ManagementSearchPage(props: PageProps<"/management/search">) {
  await requireRole("management");

  const searchParams = await props.searchParams;
  const rawQ = searchParams.q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ) ?? "";

  const results = q.trim().length >= 2 ? await runManagementSearch(q) : null;
  const totalCount = results
    ? results.students.length + results.faculty.length + results.courses.length + results.sessions.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Search</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {q.trim().length < 2
            ? "Type at least 2 characters to search students, faculty, courses, and academic sessions."
            : `${totalCount} result${totalCount === 1 ? "" : "s"} for "${q}"`}
        </p>
      </div>

      {results && totalCount === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No matches. Try a different name, student number, course code, or academic year (e.g. &ldquo;2024-25&rdquo;).
        </p>
      )}

      {results && (
        <div className="space-y-6">
          <ResultGroup title="Students" items={results.students} />
          <ResultGroup title="Faculty" items={results.faculty} />
          <ResultGroup title="Courses" items={results.courses} />
          <ResultGroup title="Academic Sessions" items={results.sessions} />
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, items }: { title: string; items: SearchResultItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {title} ({items.length})
      </h2>
      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950">
        {items.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-900/60"
          >
            <span className="font-medium text-slate-900 dark:text-slate-50">{item.label}</span>
            <span className="text-slate-500 dark:text-slate-400">{item.sublabel}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
