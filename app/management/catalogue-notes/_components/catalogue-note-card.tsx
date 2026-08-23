"use client";

import { useActionState } from "react";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { CatalogueNoteRow } from "@/lib/management/catalogue-notes";
import {
  resolveCatalogueNoteAction,
  dismissCatalogueNoteAction,
  reopenCatalogueNoteAction,
  type CatalogueNoteFormState,
} from "../actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  open: "warning",
  resolved: "success",
  dismissed: "neutral",
};

const ENTITY_LABEL: Record<string, string> = {
  course: "Course",
  curriculum_requirement: "Curriculum Requirement",
  program: "Program",
  specialization: "Specialization",
};

export function CatalogueNoteCard({ note }: { note: CatalogueNoteRow }) {
  const boundResolve = resolveCatalogueNoteAction.bind(null, note.id);
  const boundDismiss = dismissCatalogueNoteAction.bind(null, note.id);
  const [resolveState, resolveFormAction, resolvePending] = useActionState<CatalogueNoteFormState | undefined, FormData>(
    boundResolve,
    undefined
  );
  const [dismissState, dismissFormAction, dismissPending] = useActionState<CatalogueNoteFormState | undefined, FormData>(
    boundDismiss,
    undefined
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {ENTITY_LABEL[note.entity_type] ?? note.entity_type}
          </span>
          <h3 className="mt-0.5 font-medium text-slate-900 dark:text-slate-50">{note.entity_reference}</h3>
        </div>
        <StatusBadge label={note.status} tone={STATUS_TONE[note.status] ?? "neutral"} />
      </div>

      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{note.issue_summary}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{note.source_detail}</p>

      {note.status === "open" ? (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <form action={resolveFormAction} className="flex flex-wrap items-end gap-2">
            <input
              name="resolution_note"
              type="text"
              placeholder="Resolution note (optional)"
              className="min-w-[220px] rounded-md border border-slate-300 bg-transparent px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:text-slate-50"
            />
            <button
              type="submit"
              disabled={resolvePending}
              className="rounded-md bg-brand-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              {resolvePending ? "Saving..." : "Mark Resolved"}
            </button>
          </form>
          <form action={dismissFormAction}>
            <button
              type="submit"
              disabled={dismissPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900"
            >
              {dismissPending ? "Saving..." : "Dismiss"}
            </button>
          </form>
          {(resolveState?.error || dismissState?.error) && (
            <p className="w-full text-sm text-red-600 dark:text-red-400">
              {resolveState?.error || dismissState?.error}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {note.resolution_note ? `Note: ${note.resolution_note}` : "No resolution note."}
            {note.resolved_at ? ` — ${new Date(note.resolved_at).toLocaleDateString()}` : ""}
          </span>
          <form action={reopenCatalogueNoteAction.bind(null, note.id)}>
            <button type="submit" className="underline hover:text-slate-900 dark:hover:text-slate-50">
              Reopen
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
