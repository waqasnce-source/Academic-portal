import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseEnumValue,
  parsePage,
} from "@/lib/management/query-params";
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from "./status-enums";

export { ENROLLMENT_STATUSES, type EnrollmentStatus };

export const ENROLLMENTS_PAGE_SIZE = 25;

export interface EnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student: {
    id: string;
    student_number: string;
    name: string;
    email: string | null;
    /**
     * Nullable as of the Phase 6 students.profile_id relaxation — a
     * profile-less student's enrollment must still appear in this list
     * (see the Phase 8B fix note on ENROLLMENT_SELECT below). `name`/
     * `email` above are the authoritative display fields when this is
     * null, same precedence convention as students.ts/faculty.ts.
     */
    profile: { full_name: string; email: string } | null;
  };
  course_offering: {
    id: string;
    section: string;
    course: { code: string; name: string };
    semester: { name: string; academic_year: string };
  };
}

interface RawEnrollmentRow {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student: {
    id: string;
    student_number: string;
    name: string;
    email: string | null;
    profile: { full_name: string; email: string } | null;
  };
  course_offering: {
    id: string;
    section: string;
    course: { code: string; name: string };
    semester: { name: string; academic_year: string };
  };
}

export interface EnrollmentFilters {
  status: EnrollmentStatus | "";
  page: number;
}

export interface EnrollmentsResult {
  data: EnrollmentRow[];
  count: number;
  page: number;
  error: string | null;
}

/**
 * No search box here (unlike most modules): the only free-text fields
 * reachable are two levels deep (student.profile.full_name/email), and
 * PostgREST's `.or()` referencedTable scoping was only verified one level
 * deep (course_offerings' `course` embed) — rather than guess whether a
 * dot-path like `student.profile` is supported, this stays to the one
 * filter that's unambiguously safe: status, a real CHECK-constrained
 * column on the base table.
 */
export function parseEnrollmentFilters(
  searchParams: RawSearchParams
): EnrollmentFilters {
  return {
    status: parseEnumValue(searchParams.status, ENROLLMENT_STATUSES),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveEnrollmentFilters(filters: EnrollmentFilters): boolean {
  return Boolean(filters.status);
}

export function buildEnrollmentsHref(filters: EnrollmentFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/enrollments?${qs}` : "/management/enrollments";
}

/**
 * `student:students!inner(...)` mirrors the direct FK embed pattern
 * (enrollments.student_id -> students.id, NOT NULL — safe as `!inner`).
 * `profile:profiles` is a PLAIN embed (Phase 8B fix): students.profile_id
 * is nullable as of Phase 6, so a profile-less student's enrollment row
 * was previously silently dropped from this entire list whenever
 * `profile:profiles!inner` was used, the same hazard already fixed in
 * faculty.ts/students.ts during Phase 6 but missed here at the time since
 * this module (like results.ts/attendance.ts/teaching-load.ts) predates
 * that fix and was never revisited — see the Phase 8A audit and Phase 8B
 * report. `name`/`email` are now selected directly off `students` so the
 * UI has a fallback identity when `profile` is null, same precedence
 * convention as students.ts. `course_offering:course_offerings!inner(...)`
 * nests `course` and `semester` — unaffected, none of those FKs are
 * nullable.
 */
const ENROLLMENT_SELECT = `
  id,
  status,
  enrolled_at,
  student:students!inner (
    id, student_number, name, email,
    profile:profiles ( full_name, email )
  ),
  course_offering:course_offerings!inner (
    id, section,
    course:courses!inner ( code, name ),
    semester:semesters!inner ( name, academic_year )
  )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `enrollments_select_authenticated` (`has_role('management') OR ...`) is
 * the actual enforcement — a management caller sees every row.
 *
 * Counts enrollments first (head-only, no `.range()`, no embeds) and
 * clamps the requested page to the real last page before issuing the
 * ranged data query — same fix applied in every prior module.
 */
export async function getEnrollments(
  filters: EnrollmentFilters
): Promise<EnrollmentsResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getEnrollments count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load enrollment records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ENROLLMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("enrollments").select(ENROLLMENT_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);

  const from = (safePage - 1) * ENROLLMENTS_PAGE_SIZE;
  const to = from + ENROLLMENTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("enrolled_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getEnrollments data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load enrollment records." };
  }

  return {
    data: (data ?? []) as unknown as RawEnrollmentRow[] as EnrollmentRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface EnrollmentDetail {
  id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  student: { id: string; student_number: string; name: string; profile: { full_name: string } | null };
  course_offering: {
    id: string;
    section: string;
    status: string;
    capacity: number | null;
    course: { code: string; name: string };
    semester: { name: string; academic_year: string };
  };
}

const ENROLLMENT_DETAIL_SELECT = `
  id,
  status,
  enrolled_at,
  student:students!inner (
    id, student_number, name,
    profile:profiles ( full_name )
  ),
  course_offering:course_offerings!inner (
    id, section, status, capacity,
    course:courses!inner ( code, name ),
    semester:semesters!inner ( name, academic_year )
  )
`;

export async function getEnrollmentById(id: string): Promise<EnrollmentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrollments")
    .select(ENROLLMENT_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as EnrollmentDetail;
}

/** Active enrollments (any status counts toward capacity only while 'active' — completed/dropped/failed rows don't occupy a seat) for one offering. Used by the create-enrollment Server Action's capacity check. */
export async function getActiveEnrollmentCount(courseOfferingId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("course_offering_id", courseOfferingId)
    .eq("status", "active");

  if (error) {
    console.error("getActiveEnrollmentCount failed:", error);
    return 0;
  }
  return count ?? 0;
}

export interface EnrollmentInput {
  student_id: string;
  course_offering_id: string;
}

/**
 * Raw mutation helper — returns the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is enrollments_insert_management (has_role('management')).
 * status defaults to 'active' at the database level (see the initial
 * schema migration); the database's own partial unique index (`(student_id,
 * course_offering_id) WHERE status = 'active'`) is the actual
 * duplicate-active-enrollment guard (surfaces as 23505) — application-level
 * checks (student active, offering not cancelled, capacity) happen in the
 * calling Server Action before this is reached, since none of those are
 * expressible as a database constraint without inventing one.
 */
export async function createEnrollment(input: EnrollmentInput) {
  const supabase = await createClient();
  return supabase.from("enrollments").insert(input).select("id").single();
}

export async function updateEnrollmentStatus(id: string, status: EnrollmentStatus) {
  const supabase = await createClient();
  return supabase.from("enrollments").update({ status }).eq("id", id).select("id").single();
}
