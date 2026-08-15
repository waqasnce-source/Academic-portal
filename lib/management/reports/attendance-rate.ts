import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseUuid,
  parsePage,
  parseText,
} from "@/lib/management/query-params";

export const ATTENDANCE_RATE_PAGE_SIZE = 25;

/** Same reasoning/cap as teaching-load.ts — see that file's module doc. */
const RAW_FETCH_LIMIT = 2000;

const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;

export interface AttendanceRateRow {
  courseOfferingId: string;
  course: { code: string; name: string };
  semester: { name: string; academic_year: string };
  sessionCount: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  presentPercent: number | null;
}

export interface AttendanceRateFilters {
  q: string;
  semesterId: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

export interface AttendanceRateResult {
  data: AttendanceRateRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface AttendanceRateFilterOptions {
  semesters: { id: string; name: string; academic_year: string }[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseAttendanceRateFilters(searchParams: RawSearchParams): AttendanceRateFilters {
  const rawFrom = parseText(searchParams.from, 10);
  const rawTo = parseText(searchParams.to, 10);

  return {
    q: parseText(searchParams.q),
    semesterId: parseUuid(searchParams.semester),
    dateFrom: DATE_RE.test(rawFrom) ? rawFrom : "",
    dateTo: DATE_RE.test(rawTo) ? rawTo : "",
    page: parsePage(searchParams.page),
  };
}

export function hasActiveAttendanceRateFilters(filters: AttendanceRateFilters): boolean {
  return Boolean(filters.q || filters.semesterId || filters.dateFrom || filters.dateTo);
}

export function buildAttendanceRateHref(filters: AttendanceRateFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.semesterId) params.set("semester", filters.semesterId);
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/reports/attendance-rate?${qs}` : "/management/reports/attendance-rate";
}

interface RawSessionRow {
  id: string;
  course_offering: {
    id: string;
    course: { code: string; name: string };
    semester: { name: string; academic_year: string };
  };
  attendance: { status: string }[];
}

/**
 * Report row from the schema analysis: "Attendance Rate by
 * Offering/Session — tables: attendance, course_sessions,
 * course_offerings, enrollments — filters: semester, course, date range —
 * metrics: % present/absent/late/excused per offering."
 *
 * PostgREST aggregate functions are disabled on this project (confirmed
 * live — PGRST123). Rather than filter `attendance` directly (which would
 * need a two-embed-level path to reach `semester_id`, an unverified
 * depth), this queries `course_sessions` instead: `semester_id` sits one
 * embed-level away from sessions (`course_offering.semester_id`, the same
 * depth already proven in every other module), and `class_date` is a
 * plain column on `course_sessions` itself, so the date-range filter is
 * a zero-level `.gte()/.lte()`. `attendance` is pulled in as an ordinary
 * reverse-FK array embed (`attendance(status)`, ungrouped, no `(count)`
 * trick needed) and then grouped by course_offering_id, with all four
 * status counts summed, in application code.
 *
 * `course_sessions_select_authenticated` (`true`) permits reading
 * sessions; the embedded `attendance` rows are separately subject to
 * `attendance_select_authenticated` (`has_role('management') OR ...`),
 * which grants a management caller full visibility.
 */
export async function getAttendanceRateReport(
  filters: AttendanceRateFilters
): Promise<AttendanceRateResult> {
  const supabase = await createClient();

  let query = supabase
    .from("course_sessions")
    .select(
      `id,
       course_offering:course_offerings!inner (
         id,
         course:courses!inner ( code, name ),
         semester:semesters!inner ( name, academic_year )
       ),
       attendance ( status )`
    )
    .limit(RAW_FETCH_LIMIT);

  if (filters.semesterId) query = query.eq("course_offering.semester_id", filters.semesterId);
  if (filters.dateFrom) query = query.gte("class_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("class_date", filters.dateTo);

  const { data, error } = await query;

  if (error) {
    console.error("getAttendanceRateReport query failed:", error);
    return { data: [], count: 0, page: filters.page, error: "Could not load the attendance rate report." };
  }

  const rows = (data ?? []) as unknown as RawSessionRow[];
  const q = filters.q.trim().toLowerCase();

  const filtered = rows.filter((row) => {
    if (!q) return true;
    const { code, name } = row.course_offering.course;
    return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  const byOffering = new Map<string, AttendanceRateRow>();
  for (const row of filtered) {
    const offeringId = row.course_offering.id;
    let entry = byOffering.get(offeringId);
    if (!entry) {
      entry = {
        courseOfferingId: offeringId,
        course: row.course_offering.course,
        semester: row.course_offering.semester,
        sessionCount: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        presentPercent: null,
      };
      byOffering.set(offeringId, entry);
    }
    entry.sessionCount += 1;
    for (const record of row.attendance) {
      if (!(ATTENDANCE_STATUSES as readonly string[]).includes(record.status)) continue;
      entry[record.status as (typeof ATTENDANCE_STATUSES)[number]] += 1;
      entry.total += 1;
    }
  }

  for (const entry of byOffering.values()) {
    entry.presentPercent = entry.total > 0 ? Math.round((entry.present / entry.total) * 1000) / 10 : null;
  }

  const grouped = Array.from(byOffering.values()).sort(
    (a, b) => a.course.code.localeCompare(b.course.code)
  );

  const totalCount = grouped.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ATTENDANCE_RATE_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);
  const from = (safePage - 1) * ATTENDANCE_RATE_PAGE_SIZE;

  return {
    data: grouped.slice(from, from + ATTENDANCE_RATE_PAGE_SIZE),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export async function getAttendanceRateFilterOptions(): Promise<AttendanceRateFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("semesters")
    .select("id, name, academic_year")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getAttendanceRateFilterOptions semesters failed:", error);
  }

  return { semesters: data ?? [] };
}
