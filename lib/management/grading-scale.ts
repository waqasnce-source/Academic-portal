import "server-only";

import { createClient } from "@/lib/supabase/server";
import { GRADING_SCALE_STATUSES, type GradingScaleStatus } from "./status-enums";

export { GRADING_SCALE_STATUSES, type GradingScaleStatus };

export const GRADING_SCALE_PAGE_SIZE = 50;

export interface GradingScaleRow {
  id: string;
  name: string;
  min_marks: number;
  max_marks: number;
  letter_grade: string;
  grade_point: number;
  is_passing: boolean;
  status: GradingScaleStatus;
  created_at: string;
}

/**
 * No pagination controls in the UI (see the management page) — a real
 * grading scale is a short, bounded list (a handful to ~15 bands), so a
 * single ordered read is simpler and avoids an unnecessary filter/page
 * UI for what is really "the whole configuration table". PAGE_SIZE above
 * exists only as a defensive cap on the query, not as an active pagination
 * flow.
 */
export async function getGradingScale(): Promise<{ data: GradingScaleRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_scale")
    .select("id, name, min_marks, max_marks, letter_grade, grade_point, is_passing, status, created_at")
    .order("min_marks", { ascending: false })
    .limit(GRADING_SCALE_PAGE_SIZE);

  if (error) {
    console.error("getGradingScale failed:", error);
    return { data: [], error: "Could not load the grading scale." };
  }
  return { data: (data ?? []) as GradingScaleRow[], error: null };
}

/** Only 'active' bands — used by degree-audit/GPA computation, which must never consult a deactivated/superseded band. Reuses getGradingScale() rather than a second query definition. */
export async function getActiveGradingScale(): Promise<GradingScaleRow[]> {
  const { data } = await getGradingScale();
  return data.filter((band) => band.status === "active");
}

export interface GradingScaleDetail {
  id: string;
  name: string;
  min_marks: number;
  max_marks: number;
  letter_grade: string;
  grade_point: number;
  is_passing: boolean;
  status: GradingScaleStatus;
}

export async function getGradingScaleBandById(id: string): Promise<GradingScaleDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grading_scale")
    .select("id, name, min_marks, max_marks, letter_grade, grade_point, is_passing, status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as GradingScaleDetail;
}

export interface GradingScaleInput {
  name: string;
  min_marks: number;
  max_marks: number;
  letter_grade: string;
  grade_point: number;
  is_passing: boolean;
  status: GradingScaleStatus;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is grading_scale_insert_management / _update_management
 * (has_role('management')). The database-level
 * grading_scale_no_overlap_active exclusion constraint is the actual
 * overlap guard among active bands — surfaces as a 23P01
 * (exclusion_violation) SQLSTATE, distinct from the usual 23505/23514,
 * which toUserMessage() callers must map explicitly.
 */
export async function createGradingScaleBand(input: GradingScaleInput) {
  const supabase = await createClient();
  return supabase.from("grading_scale").insert(input).select("id").single();
}

export async function updateGradingScaleBand(id: string, input: GradingScaleInput) {
  const supabase = await createClient();
  return supabase.from("grading_scale").update(input).eq("id", id).select("id").single();
}

export async function setGradingScaleBandStatus(id: string, status: GradingScaleStatus) {
  const supabase = await createClient();
  return supabase.from("grading_scale").update({ status }).eq("id", id);
}
