import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, firstValue, parsePage } from "@/lib/management/query-params";

export const RESULTS_PAGE_SIZE = 25;

/**
 * results has no status/enum column at all — `grade` is free text with no
 * CHECK constraint, and `marks`/`grade_point` are unconstrained beyond
 * `>= 0` (see docs/database-design.md: "No grading-scale bound is
 * imposed... intentionally not imposed"). The one real, schema-grounded
 * binary distinction is `published_at`'s nullability — the migration's
 * own column comment says as much: "NULL means the result is not yet
 * visible to the student." That's what the "Published" filter reads, not
 * an invented status.
 */
export const PUBLISH_FILTER_VALUES = ["published", "unpublished"] as const;
export type PublishFilterValue = (typeof PUBLISH_FILTER_VALUES)[number];

export interface ResultRow {
  id: string;
  marks: number | null;
  grade: string | null;
  grade_point: number | null;
  published_at: string | null;
  created_at: string;
  enrollment: {
    /** profile nullable as of Phase 6 — see the Phase 8B fix note on RESULT_SELECT below; `name` is the fallback display identity. */
    student: { name: string; profile: { full_name: string } | null };
    course_offering: {
      course: { code: string; name: string };
      semester: { name: string };
    };
  };
}

export interface ResultFilters {
  published: PublishFilterValue | "";
  page: number;
}

export interface ResultsResult {
  data: ResultRow[];
  count: number;
  page: number;
  error: string | null;
}

export function parseResultFilters(searchParams: RawSearchParams): ResultFilters {
  const raw = firstValue(searchParams.published).trim();
  const published = (PUBLISH_FILTER_VALUES as readonly string[]).includes(raw)
    ? (raw as PublishFilterValue)
    : "";

  return { published, page: parsePage(searchParams.page) };
}

export function hasActiveResultFilters(filters: ResultFilters): boolean {
  return Boolean(filters.published);
}

export function buildResultsHref(filters: ResultFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.published) params.set("published", filters.published);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/results?${qs}` : "/management/results";
}

/**
 * `enrollment:enrollments!inner(...)` mirrors the nested embed depth
 * already used in attendance.ts (enrollment -> student -> profile,
 * enrollment -> course_offering -> course/semester). No search filter —
 * same reasoning as enrollments.ts/attendance.ts: the identifying text
 * fields are multiple embed-levels deep.
 *
 * `profile:profiles` is a PLAIN embed (Phase 8B fix, same hazard as
 * enrollments.ts/attendance.ts): students.profile_id is nullable, so
 * `profile:profiles!inner` previously dropped every result row for a
 * profile-less student's enrollment entirely. `name` is selected as the
 * fallback identity.
 */
const RESULT_SELECT = `
  id,
  marks,
  grade,
  grade_point,
  published_at,
  created_at,
  enrollment:enrollments!inner (
    student:students!inner ( name, profile:profiles ( full_name ) ),
    course_offering:course_offerings!inner (
      course:courses!inner ( code, name ),
      semester:semesters!inner ( name )
    )
  )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `results_select_authenticated` (`has_role('management') OR ...`) is
 * the actual enforcement — a management caller sees every row, including
 * unpublished ones (the student-self branch of that policy is the only
 * one gated by `published_at IS NOT NULL`; the management branch has no
 * such restriction).
 *
 * Counts records first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getResults(filters: ResultFilters): Promise<ResultsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("results").select("id", { count: "exact", head: true });

  if (filters.published === "published") countQuery = countQuery.not("published_at", "is", null);
  if (filters.published === "unpublished") countQuery = countQuery.is("published_at", null);

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getResults count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load result records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / RESULTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("results").select(RESULT_SELECT);

  if (filters.published === "published") dataQuery = dataQuery.not("published_at", "is", null);
  if (filters.published === "unpublished") dataQuery = dataQuery.is("published_at", null);

  const from = (safePage - 1) * RESULTS_PAGE_SIZE;
  const to = from + RESULTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getResults data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load result records." };
  }

  return {
    data: (data ?? []) as unknown as ResultRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface ResultDetail {
  id: string;
  enrollment_id: string;
  marks: number | null;
  grade: string | null;
  grade_point: number | null;
  remarks: string | null;
  published_at: string | null;
  recorded_by: string | null;
}

export async function getResultById(id: string): Promise<ResultDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("results")
    .select("id, enrollment_id, marks, grade, grade_point, remarks, published_at, recorded_by")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ResultDetail;
}

export interface ResultInput {
  enrollment_id: string;
  marks: number | null;
  grade: string | null;
  grade_point: number | null;
  remarks: string | null;
  published_at: string | null;
  recorded_by: string | null;
}

/**
 * Data-access foundation only — no Server Action/UI calls these yet (no
 * grade-entry workflow exists in Phase 8B, per explicit instruction).
 * Built now so that whichever future phase adds grade-entry UI has no way
 * to bypass revision history: createResult() is a plain insert (the
 * initial recording of a result has no "previous" state, so no
 * result_revisions row is expected or created); updateResult() is also a
 * plain update — trg_results_record_revision (see the Phase 8B migration)
 * inserts the result_revisions row automatically, at the database level,
 * for every update that actually changes marks/grade/grade_point. There
 * is deliberately no separate "updateResultWithReason" helper: passing a
 * reason requires a session-local Postgres setting
 * (`app.result_change_reason`) that no caller sets yet — left as a
 * documented extension point for the Phase 8D grade-entry workflow rather
 * than built speculatively here.
 */
export async function createResult(input: ResultInput) {
  const supabase = await createClient();
  return supabase.from("results").insert(input).select("id").single();
}

export async function updateResult(id: string, input: ResultInput) {
  const supabase = await createClient();
  return supabase.from("results").update(input).eq("id", id).select("id").single();
}

export interface ResultRevisionRow {
  id: string;
  previous_marks: number | null;
  previous_grade: string | null;
  previous_grade_point: number | null;
  new_marks: number | null;
  new_grade: string | null;
  new_grade_point: number | null;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
}

/** Full change history for one result, newest first — read-only; rows are only ever created by trg_results_record_revision, never by application code. */
export async function getResultRevisions(resultId: string): Promise<ResultRevisionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("result_revisions")
    .select(
      "id, previous_marks, previous_grade, previous_grade_point, new_marks, new_grade, new_grade_point, changed_by, changed_at, reason"
    )
    .eq("result_id", resultId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("getResultRevisions failed:", error);
    return [];
  }
  return (data ?? []) as ResultRevisionRow[];
}
