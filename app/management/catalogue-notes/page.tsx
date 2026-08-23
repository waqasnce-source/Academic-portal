import { requireRole } from "@/lib/supabase/dal";
import {
  getCatalogueNotes,
  getCatalogueNoteCountsByStatus,
  parseCatalogueNoteFilters,
} from "@/lib/management/catalogue-notes";
import { CatalogueNoteFiltersForm } from "./_components/catalogue-note-filters-form";
import { CatalogueNoteCard } from "./_components/catalogue-note-card";

/**
 * "Data Issues" -- every source-catalogue anomaly recorded during the
 * academic-catalogue seed (conflicting course codes/titles, range
 * credit-hours that couldn't be represented, unresolved credit-hour
 * rules), for administrator review. Resolving/dismissing a note never
 * alters the record it's about -- see lib/management/catalogue-notes.ts.
 */
export default async function CatalogueNotesPage(props: PageProps<"/management/catalogue-notes">) {
  await requireRole("management");

  const rawSearchParams = await props.searchParams;
  const filters = parseCatalogueNoteFilters(rawSearchParams);

  const [{ data: notes, error }, counts] = await Promise.all([
    getCatalogueNotes(filters),
    getCatalogueNoteCountsByStatus(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Data Issues</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Source-catalogue anomalies flagged during data entry — conflicting codes, unresolved credit-hour rules,
          and similar. Nothing here was silently corrected; resolving a note only records that it&rsquo;s been reviewed.
        </p>
      </div>

      <div className="flex gap-3 text-sm">
        <span className="rounded-md border border-slate-200 px-3 py-1.5 dark:border-slate-800">
          <strong className="text-slate-900 dark:text-slate-50">{counts.open}</strong>{" "}
          <span className="text-slate-500 dark:text-slate-400">open</span>
        </span>
        <span className="rounded-md border border-slate-200 px-3 py-1.5 dark:border-slate-800">
          <strong className="text-slate-900 dark:text-slate-50">{counts.resolved}</strong>{" "}
          <span className="text-slate-500 dark:text-slate-400">resolved</span>
        </span>
        <span className="rounded-md border border-slate-200 px-3 py-1.5 dark:border-slate-800">
          <strong className="text-slate-900 dark:text-slate-50">{counts.dismissed}</strong>{" "}
          <span className="text-slate-500 dark:text-slate-400">dismissed</span>
        </span>
      </div>

      <CatalogueNoteFiltersForm filters={filters} />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No records match this filter.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <CatalogueNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
