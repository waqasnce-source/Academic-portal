"use client";

import Link from "next/link";
import { useState } from "react";
import { fieldClasses, labelClasses } from "@/app/management/_components/form-styles";
import { searchEnrollableStudentsAction, bulkEnrollStudentsAction } from "../actions";
import type { StudentPickerRow, BulkEnrollOutcome } from "@/lib/management/enrollments";

/**
 * The primary bulk-enrollment workflow: search active students not
 * already enrolled in this offering, select any number via checkbox, and
 * enroll them all in one action — rather than requiring management to
 * open the full enrollment-create form once per student for a large
 * class.
 */
export function BulkEnrollPanel({ offeringId }: { offeringId: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentPickerRow[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [outcome, setOutcome] = useState<BulkEnrollOutcome | null>(null);

  async function runSearch() {
    setSearching(true);
    setOutcome(null);
    const rows = await searchEnrollableStudentsAction(offeringId, query);
    setResults(rows);
    setSearching(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    if (!results) return;
    setSelected(new Set(results.map((r) => r.id)));
  }

  async function handleEnroll() {
    if (selected.size === 0) return;
    setEnrolling(true);
    const result = await bulkEnrollStudentsAction(offeringId, [...selected]);
    setOutcome(result);
    setEnrolling(false);
    setSelected(new Set());
    // Re-run the search so newly-enrolled students drop out of the picker.
    const rows = await searchEnrollableStudentsAction(offeringId, query);
    setResults(rows);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void runSearch();
        }}
        className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
      >
        Manage Students
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Manage Students</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          Close
        </button>
      </div>

      {outcome && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Enrolled {outcome.enrolled} student{outcome.enrolled === 1 ? "" : "s"}.
          {outcome.failed.length > 0 && ` ${outcome.failed.length} could not be enrolled: ${outcome.failed.map((f) => f.error).join("; ")}`}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label htmlFor="student-search" className={labelClasses}>
            Search students by name, email, or student number
          </label>
          <input
            id="student-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            className={fieldClasses}
          />
        </div>
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={searching}
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {results && (
        <>
          {results.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No matching active students found (already-enrolled students are excluded from this list).
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <button type="button" onClick={selectAllVisible} className="underline hover:text-slate-900 dark:hover:text-slate-50">
                  Select all visible ({results.length})
                </button>
                <span>{selected.size} selected</span>
              </div>
              <div className="max-h-64 overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {results.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggle(s.id)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <Link href={`/management/students/${s.id}`} className="font-medium text-slate-900 hover:underline dark:text-slate-50">
                          {s.name}
                        </Link>
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{s.studentNumber}</span>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {s.email ?? "—"} · {s.program}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => void handleEnroll()}
                disabled={enrolling || selected.size === 0}
                className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                {enrolling ? "Enrolling..." : `Enroll Selected (${selected.size})`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
