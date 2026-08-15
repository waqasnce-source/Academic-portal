import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, firstValue, parsePage } from "@/lib/management/query-params";

export const TIMETABLES_PAGE_SIZE = 25;

/** Mirrors timetables.day_of_week's CHECK constraint (0-6). 0 = Sunday, matching Postgres's own EXTRACT(DOW) convention. */
export const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export interface TimetableRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  course_offering: {
    section: string;
    course: { code: string; name: string };
    semester: { name: string };
  };
}

export interface TimetableFilters {
  /** '' means "all days"; otherwise a validated 0-6 string. */
  dayOfWeek: string;
  page: number;
}

export interface TimetablesResult {
  data: TimetableRow[];
  count: number;
  page: number;
  error: string | null;
}

/**
 * No search filter — same reasoning as attendance.ts/results.ts: the
 * identifying text (course code/name) sits two embed-levels deep
 * (course_offering.course), one level past the single-level
 * `referencedTable` scoping already proven for course_offerings' own
 * `course` embed, so this doesn't guess at whether a nested dot-path
 * works.
 */
export function parseTimetableFilters(searchParams: RawSearchParams): TimetableFilters {
  const raw = firstValue(searchParams.day).trim();
  const asNumber = Number.parseInt(raw, 10);
  const dayOfWeek =
    Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 6 ? String(asNumber) : "";

  return { dayOfWeek, page: parsePage(searchParams.page) };
}

export function hasActiveTimetableFilters(filters: TimetableFilters): boolean {
  return Boolean(filters.dayOfWeek);
}

export function buildTimetablesHref(filters: TimetableFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.dayOfWeek) params.set("day", filters.dayOfWeek);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/timetable?${qs}` : "/management/timetable";
}

/**
 * `course_offering:course_offerings!inner(...)` mirrors the same direct
 * FK embed pattern used throughout (timetables.course_offering_id ->
 * course_offerings.id), nested to course/semester.
 */
const TIMETABLE_SELECT = `
  id,
  day_of_week,
  start_time,
  end_time,
  room,
  course_offering:course_offerings!inner (
    section,
    course:courses!inner ( code, name ),
    semester:semesters!inner ( name )
  )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `timetables_select_authenticated` (`using (true)`) is the actual
 * enforcement.
 *
 * Counts records first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module. Ordered by day of week
 * then start time — the natural weekly-schedule reading order, not a
 * business-rule assumption.
 */
export async function getTimetables(
  filters: TimetableFilters
): Promise<TimetablesResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("timetables").select("id", { count: "exact", head: true });

  if (filters.dayOfWeek) countQuery = countQuery.eq("day_of_week", filters.dayOfWeek);

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getTimetables count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load timetable records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / TIMETABLES_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("timetables").select(TIMETABLE_SELECT);

  if (filters.dayOfWeek) dataQuery = dataQuery.eq("day_of_week", filters.dayOfWeek);

  const from = (safePage - 1) * TIMETABLES_PAGE_SIZE;
  const to = from + TIMETABLES_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getTimetables data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load timetable records." };
  }

  return {
    data: (data ?? []) as unknown as TimetableRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}
