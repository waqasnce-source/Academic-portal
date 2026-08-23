import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, parseEnumValue } from "@/lib/management/query-params";

/**
 * Read/resolve access for catalogue_notes -- the source-data anomaly
 * mechanism added in the academic-catalogue phase (see
 * supabase/migrations/20260818130000_academic_catalogue_schema.sql).
 * Resolving or dismissing a note never touches the record it's about
 * (a course, a curriculum_requirements row, etc.) -- it only records that
 * an administrator has reviewed the flag.
 */

export const CATALOGUE_NOTE_STATUSES = ["open", "resolved", "dismissed"] as const;
export type CatalogueNoteStatus = (typeof CATALOGUE_NOTE_STATUSES)[number];

export interface CatalogueNoteRow {
  id: string;
  entity_type: string;
  entity_reference: string;
  course_id: string | null;
  course_code: string | null;
  issue_summary: string;
  source_detail: string;
  status: CatalogueNoteStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface CatalogueNoteFilters {
  status: CatalogueNoteStatus | "";
}

export function parseCatalogueNoteFilters(searchParams: RawSearchParams): CatalogueNoteFilters {
  return { status: parseEnumValue(searchParams.status, CATALOGUE_NOTE_STATUSES) };
}

const SELECT = `
  id, entity_type, entity_reference, course_id, issue_summary, source_detail,
  status, resolution_note, resolved_at, created_at,
  course:courses ( code )
`;

export async function getCatalogueNotes(filters: CatalogueNoteFilters): Promise<{ data: CatalogueNoteRow[]; error: string | null }> {
  const supabase = await createClient();

  let query = supabase.from("catalogue_notes").select(SELECT);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("getCatalogueNotes failed:", error);
    return { data: [], error: "Could not load catalogue notes." };
  }

  const rows = (data ?? []) as unknown as (Omit<CatalogueNoteRow, "course_code"> & { course: { code: string } | null })[];
  return {
    data: rows.map((r) => ({ ...r, course_code: r.course?.code ?? null })),
    error: null,
  };
}

export async function getCatalogueNoteCountsByStatus(): Promise<Record<CatalogueNoteStatus, number>> {
  const supabase = await createClient();
  const counts: Record<CatalogueNoteStatus, number> = { open: 0, resolved: 0, dismissed: 0 };

  for (const status of CATALOGUE_NOTE_STATUSES) {
    const { count } = await supabase
      .from("catalogue_notes")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }
  return counts;
}

export async function setCatalogueNoteStatus(
  id: string,
  status: "resolved" | "dismissed",
  resolutionNote: string,
  resolvedBy: string
) {
  const supabase = await createClient();
  return supabase
    .from("catalogue_notes")
    .update({ status, resolution_note: resolutionNote || null, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq("id", id);
}

export async function reopenCatalogueNote(id: string) {
  const supabase = await createClient();
  return supabase
    .from("catalogue_notes")
    .update({ status: "open", resolution_note: null, resolved_by: null, resolved_at: null })
    .eq("id", id);
}
