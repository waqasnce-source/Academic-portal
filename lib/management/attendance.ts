import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseEnumValue,
  parsePage,
} from "@/lib/management/query-params";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "./status-enums";

export { ATTENDANCE_STATUSES, type AttendanceStatus };

export const ATTENDANCE_PAGE_SIZE = 25;

export interface AttendanceRow {
  id: string;
  status: AttendanceStatus;
  remarks: string | null;
  created_at: string;
  enrollment: {
    /** profile nullable as of Phase 6 — see the Phase 8B fix note on ATTENDANCE_SELECT below; `name` is the fallback display identity. */
    student: { name: string; profile: { full_name: string } | null };
  };
  course_session: {
    class_date: string;
    start_time: string;
    room: string | null;
    course_offering: {
      section: string;
      course: { code: string; name: string };
      semester: { name: string };
    };
  };
}

export interface AttendanceFilters {
  status: AttendanceStatus | "";
  page: number;
}

export interface AttendanceResult {
  data: AttendanceRow[];
  count: number;
  page: number;
  error: string | null;
}

/**
 * Status-only filter, same reasoning as enrollments.ts: the free-text/
 * identity fields here (student name, course code) sit three and four
 * embed-levels deep respectively
 * (enrollment.student.profile.full_name,
 * course_session.course_offering.course.code) — deeper than the one-level
 * `referencedTable` scoping already verified for course_offerings, so
 * this doesn't attempt a search filter rather than guess whether
 * multi-level `.or()` scoping works.
 */
export function parseAttendanceFilters(
  searchParams: RawSearchParams
): AttendanceFilters {
  return {
    status: parseEnumValue(searchParams.status, ATTENDANCE_STATUSES),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveAttendanceFilters(filters: AttendanceFilters): boolean {
  return Boolean(filters.status);
}

export function buildAttendanceHref(filters: AttendanceFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/attendance?${qs}` : "/management/attendance";
}

/**
 * `enrollment:enrollments!inner(...)` and `course_session:course_sessions!inner(...)`
 * are direct FK embeds (attendance.enrollment_id -> enrollments.id,
 * attendance.course_session_id -> course_sessions.id), each nested
 * further down to profile/course/semester — deeper versions of the same
 * embedding already proven in enrollments.ts. The DB enforces (via
 * `trg_attendance_offering_match`) that an attendance row's enrollment
 * and course_session always resolve to the same course_offering, so
 * showing the offering's course/semester via the course_session path
 * alone is sufficient — it's not a separate, independently-varying value
 * from what the enrollment side would show.
 *
 * `profile:profiles` is a PLAIN embed (Phase 8B fix, same hazard as
 * enrollments.ts): students.profile_id is nullable, so
 * `profile:profiles!inner` previously dropped every attendance row for a
 * profile-less student's enrollment entirely. `name` is selected as the
 * fallback identity.
 */
const ATTENDANCE_SELECT = `
  id,
  status,
  remarks,
  created_at,
  enrollment:enrollments!inner (
    student:students!inner ( name, profile:profiles ( full_name ) )
  ),
  course_session:course_sessions!inner (
    class_date, start_time, room,
    course_offering:course_offerings!inner (
      section,
      course:courses!inner ( code, name ),
      semester:semesters!inner ( name )
    )
  )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `attendance_select_authenticated` (`has_role('management') OR ...`) is
 * the actual enforcement — a management caller sees every row.
 *
 * Counts records first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getAttendance(
  filters: AttendanceFilters
): Promise<AttendanceResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("attendance")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getAttendance count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load attendance records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ATTENDANCE_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("attendance").select(ATTENDANCE_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);

  const from = (safePage - 1) * ATTENDANCE_PAGE_SIZE;
  const to = from + ATTENDANCE_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getAttendance data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load attendance records." };
  }

  return {
    data: (data ?? []) as unknown as AttendanceRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}
