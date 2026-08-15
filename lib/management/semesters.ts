import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SEMESTER_STATUSES, type SemesterStatus } from "./status-enums";

export { SEMESTER_STATUSES, type SemesterStatus };

export const SEMESTERS_PAGE_SIZE = 25;

export interface SemesterRow {
  id: string;
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SemesterStatus;
  created_at: string;
  /** Count of course_offerings rows for this semester_id. */
  offeringCount: number;
}

/** Raw PostgREST shape before normalizing the embedded count aggregate. */
interface RawSemesterRow {
  id: string;
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SemesterStatus;
  created_at: string;
  course_offerings: { count: number }[] | null;
}

export interface SemesterFilters {
  /**
   * Searches both `academic_year` and `name` on the semesters table
   * itself — same-table `.or()`, no cross-table restriction.
   * `academic_year` has no CHECK constraint (unlike status), so it's
   * search text, not a dropdown — same treatment faculty.ts gave
   * `designation`.
   */
  q: string;
  status: SemesterStatus | "";
  page: number;
}

export interface SemestersResult {
  data: SemesterRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getSemesters(). */
  page: number;
  error: string | null;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Validates and normalizes raw URL search params into typed filters.
 * Anything that doesn't match a known-good shape is dropped rather than
 * passed through to the query — same approach as every prior module.
 */
export function parseSemesterFilters(
  searchParams: RawSearchParams
): SemesterFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (SEMESTER_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as SemesterStatus)
    : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, status, page };
}

export function hasActiveSemesterFilters(filters: SemesterFilters): boolean {
  return Boolean(filters.q || filters.status);
}

export function buildSemestersHref(filters: SemesterFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/semesters?${qs}` : "/management/semesters";
}

/**
 * Semesters has no FK of its own to another table — unlike every prior
 * module, there's no department (or any other) relationship to embed or
 * filter by here; this table sits at the top of its own small hierarchy
 * (`course_offerings.semester_id -> semesters.id` is the only link, and
 * it points *at* semesters, not from it). `course_offerings(count)` is a
 * reverse-FK embedded aggregate — same documented shape confirmed for
 * departments.ts/programs.ts/courses.ts, evaluated under
 * `course_offerings_select_authenticated` (`using (true)`).
 */
const SEMESTER_SELECT = `
  id,
  academic_year,
  name,
  start_date,
  end_date,
  status,
  created_at,
  course_offerings(count)
`;

function normalize(row: RawSemesterRow): SemesterRow {
  return {
    id: row.id,
    academic_year: row.academic_year,
    name: row.name,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    created_at: row.created_at,
    offeringCount: row.course_offerings?.[0]?.count ?? 0,
  };
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `semesters_authenticated_select` (`using (true)`) is the actual
 * enforcement for the semester rows themselves; offeringCount is
 * separately gated by `course_offerings_select_authenticated`
 * (`using (true)`).
 *
 * Counts semesters first (head-only, no `.range()`, no embed) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getSemesters(
  filters: SemesterFilters
): Promise<SemestersResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("semesters")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(
      `academic_year.ilike.%${escaped}%,name.ilike.%${escaped}%`
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getSemesters count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load semester records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / SEMESTERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("semesters").select(SEMESTER_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`academic_year.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * SEMESTERS_PAGE_SIZE;
  const to = from + SEMESTERS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("start_date", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getSemesters data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load semester records." };
  }

  return {
    data: ((data ?? []) as unknown as RawSemesterRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface SemesterDetail {
  id: string;
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SemesterStatus;
}

export interface SemesterInput {
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  status: SemesterStatus;
}

/** For the edit form's pre-fill — plain single-row read, same RLS as getSemesters(). */
export async function getSemesterById(id: string): Promise<SemesterDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("semesters")
    .select("id, academic_year, name, start_date, end_date, status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SemesterDetail;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is `semesters_insert_management` /
 * `semesters_update_management` (`has_role('management')`). No separate
 * status-toggle helper: unlike the active/inactive modules, semesters.status
 * is a three-value lifecycle (upcoming/ongoing/completed), so status is set
 * through the same Edit form/action as every other field, not a one-click
 * binary flip.
 */
export async function createSemester(input: SemesterInput) {
  const supabase = await createClient();
  return supabase.from("semesters").insert(input).select("id").single();
}

export async function updateSemester(id: string, input: SemesterInput) {
  const supabase = await createClient();
  return supabase.from("semesters").update(input).eq("id", id).select("id").single();
}
