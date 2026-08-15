import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, parseUuid, parseText } from "@/lib/management/query-params";

/** Same reasoning/cap as teaching-load.ts and attendance-rate.ts. */
const RAW_FETCH_LIMIT = 3000;

export interface PublicationSummary {
  published: number;
  unpublished: number;
  total: number;
  publishedPercent: number | null;
  error: string | null;
}

export interface PublicationFilters {
  semesterId: string;
  q: string;
}

export interface PublicationFilterOptions {
  semesters: { id: string; name: string; academic_year: string }[];
}

export function parsePublicationFilters(searchParams: RawSearchParams): PublicationFilters {
  return {
    semesterId: parseUuid(searchParams.semester),
    q: parseText(searchParams.q),
  };
}

export function hasActivePublicationFilters(filters: PublicationFilters): boolean {
  return Boolean(filters.semesterId || filters.q);
}

export function buildPublicationHref(filters: PublicationFilters): string {
  const params = new URLSearchParams();
  if (filters.semesterId) params.set("semester", filters.semesterId);
  if (filters.q) params.set("q", filters.q);

  const qs = params.toString();
  return qs ? `/management/reports/results-publication?${qs}` : "/management/reports/results-publication";
}

interface RawEnrollmentRow {
  course_offering: { course: { code: string; name: string } };
  results: { published_at: string | null }[];
}

/**
 * Report row from the schema analysis: "Results Publication Status
 * Summary — tables: results — filters: semester, course — metrics:
 * published vs. unpublished counts (`published_at IS NULL` check,
 * already used in the Results module)."
 *
 * Filtering `results` directly by semester/course would need a
 * two-embed-level path (`enrollment.course_offering.semester_id`), an
 * unverified depth (only one-level dot-path embedded filters are proven
 * against this project). So this queries `enrollments` instead — where
 * `course_offering.semester_id` is the same one-level path already proven
 * everywhere else — and pulls `results` in as an ordinary reverse-FK
 * embed (`results(published_at)`, 0 or 1 entries per enrollment, since
 * `results.enrollment_id` is unique). Enrollments with no results row at
 * all are excluded from the published/unpublished counts entirely (a
 * missing result is not the same as an unpublished one, and the report
 * only asks for those two categories).
 *
 * `enrollments_select_authenticated` (`has_role('management') OR ...`)
 * and `results_select_authenticated` (same override) both permit a
 * management caller to read everything needed.
 */
export async function getPublicationSummary(
  filters: PublicationFilters
): Promise<PublicationSummary> {
  const supabase = await createClient();

  let query = supabase
    .from("enrollments")
    .select(
      `course_offering:course_offerings!inner ( course:courses!inner ( code, name ) ),
       results ( published_at )`
    )
    .limit(RAW_FETCH_LIMIT);

  if (filters.semesterId) query = query.eq("course_offering.semester_id", filters.semesterId);

  const { data, error } = await query;

  if (error) {
    console.error("getPublicationSummary query failed:", error);
    return { published: 0, unpublished: 0, total: 0, publishedPercent: null, error: "Could not load the results publication summary." };
  }

  const rows = (data ?? []) as unknown as RawEnrollmentRow[];
  const q = filters.q.trim().toLowerCase();

  let published = 0;
  let unpublished = 0;

  for (const row of rows) {
    if (q) {
      const { code, name } = row.course_offering.course;
      if (!code.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue;
    }
    for (const result of row.results) {
      if (result.published_at) published += 1;
      else unpublished += 1;
    }
  }

  const total = published + unpublished;

  return {
    published,
    unpublished,
    total,
    publishedPercent: total > 0 ? Math.round((published / total) * 1000) / 10 : null,
    error: null,
  };
}

export async function getPublicationFilterOptions(): Promise<PublicationFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("semesters")
    .select("id, name, academic_year")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getPublicationFilterOptions semesters failed:", error);
  }

  return { semesters: data ?? [] };
}
