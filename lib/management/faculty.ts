import "server-only";

import { createClient } from "@/lib/supabase/server";
import { FACULTY_STATUSES, type FacultyStatus } from "./status-enums";

export { FACULTY_STATUSES, type FacultyStatus };

export const FACULTY_PAGE_SIZE = 25;

export interface FacultyRow {
  id: string;
  employee_number: string | null;
  name: string;
  email: string | null;
  designation: string;
  status: FacultyStatus;
  joined_date: string | null;
  created_at: string;
  /**
   * Nullable since Phase 3 (faculty.profile_id relaxation) — most seeded
   * roster entries have no linked account. `name`/`email` above are
   * authoritative when this is null.
   */
  profile: {
    id: string;
    full_name: string;
    email: string;
    status: "active" | "inactive" | "suspended";
  } | null;
  /** Nullable since Phase 3 — several roster entries have no stated department. */
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface FacultyFilters {
  q: string;
  employeeNumber: string;
  /**
   * `designation` has no CHECK constraint in the schema (free text set by
   * whoever enters faculty records), unlike students.status. A dropdown of
   * "valid" designations would mean inventing a vocabulary the schema
   * doesn't define, so this is a substring search instead — the same
   * treatment as employeeNumber, not a category filter.
   */
  designation: string;
  status: FacultyStatus | "";
  departmentId: string;
  page: number;
}

export interface FacultyResult {
  data: FacultyRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getFaculty(). */
  page: number;
  error: string | null;
}

export interface FacultyFilterOptions {
  departments: { id: string; name: string }[];
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Validates and normalizes raw URL search params into typed filters.
 * Anything that doesn't match a known-good shape is dropped rather than
 * passed through to the query — same "invalid input is ignored, not
 * trusted" approach as parseStudentFilters.
 */
export function parseFacultyFilters(
  searchParams: RawSearchParams
): FacultyFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);
  const employeeNumber = firstValue(searchParams.employee_number)
    .trim()
    .slice(0, 50);
  const designation = firstValue(searchParams.designation).trim().slice(0, 100);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (FACULTY_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as FacultyStatus)
    : "";

  const rawDepartment = firstValue(searchParams.department).trim();
  const departmentId = UUID_RE.test(rawDepartment) ? rawDepartment : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, employeeNumber, designation, status, departmentId, page };
}

export function hasActiveFacultyFilters(filters: FacultyFilters): boolean {
  return Boolean(
    filters.q ||
      filters.employeeNumber ||
      filters.designation ||
      filters.status ||
      filters.departmentId
  );
}

export function buildFacultyHref(filters: FacultyFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.employeeNumber) params.set("employee_number", filters.employeeNumber);
  if (filters.designation) params.set("designation", filters.designation);
  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/faculty?${qs}` : "/management/faculty";
}

/**
 * profile:profiles and department:departments are plain (not `!inner`)
 * embeds — both faculty.profile_id and faculty.department_id have been
 * nullable since Phase 3, and an `!inner` join here silently drops any
 * faculty row missing either one. This was a real, previously-unnoticed
 * bug: every one of the 27 seeded NCEG roster entries has profile_id
 * null, so `/management/faculty` was silently showing 0 results despite
 * 27 real rows existing — caught during the Phase 6 audit, fixed here.
 */
const FACULTY_SELECT = `
  id,
  employee_number,
  name,
  email,
  designation,
  status,
  joined_date,
  created_at,
  profile:profiles ( id, full_name, email, status ),
  department:departments ( id, code, name )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `faculty_select_authenticated` RLS is the actual enforcement — a
 * management caller sees every row via `has_role('management')`.
 *
 * Counts first (head-only, no `.range()`) and clamps the requested page to
 * the real last page before issuing the ranged data query — same fix
 * applied to lib/management/students.ts after a huge/stale `page` value
 * was found to make PostgREST reject the range outright.
 */
/**
 * Safety ceiling on the unpaginated fetch below — NOT a normal-operation
 * cap. An institution's faculty roster is a small, bounded dataset (unlike
 * Students/Enrollments, which genuinely need server pagination), so this
 * is wildly larger than any real faculty count is ever expected to reach.
 */
const FACULTY_SAFETY_CAP = 2000;

/**
 * Deliberately NOT server-paginated (see FACULTY_SAFETY_CAP) — grouping
 * faculty by discipline (FacultyTable) requires the full matching result
 * set in one place; slicing into FACULTY_PAGE_SIZE pages first would split
 * one discipline's roster across multiple pages/sections, which is exactly
 * the bug this replaced. Same "small bounded dataset" reasoning already
 * applied to Semester -> Courses.
 */
export async function getFaculty(
  filters: FacultyFilters
): Promise<FacultyResult> {
  const supabase = await createClient();

  let dataQuery = supabase.from("faculty").select(FACULTY_SELECT, { count: "exact" });

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.employeeNumber) {
    dataQuery = dataQuery.ilike("employee_number", `%${filters.employeeNumber}%`);
  }
  if (filters.designation) {
    dataQuery = dataQuery.ilike("designation", `%${filters.designation}%`);
  }
  if (filters.departmentId) dataQuery = dataQuery.eq("department_id", filters.departmentId);
  if (filters.q) {
    // name/email are top-level faculty columns (Phase 3) — searching them
    // directly avoids the embedded-table OR limitation entirely and, as
    // of the Phase 6 fix above, actually matches profile-less roster
    // entries too. employee_number/designation have their own dedicated
    // filters above.
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { data, count, error } = await dataQuery
    .order("employee_number", { ascending: true })
    .range(0, FACULTY_SAFETY_CAP - 1);

  if (error) {
    console.error("getFaculty data query failed:", error);
    return { data: [], count: 0, page: 1, error: "Could not load faculty records." };
  }

  return {
    data: (data ?? []) as unknown as FacultyRow[],
    count: count ?? 0,
    page: 1,
    error: null,
  };
}

/**
 * Single-row counterpart to getFaculty()'s list query, using the exact
 * same FACULTY_SELECT (profile/department joined, nullable-safe) — for
 * the Management faculty hub header. Not a second shape/select for the
 * same table.
 */
export async function getFacultyProfile(id: string): Promise<FacultyRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("faculty").select(FACULTY_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as unknown as FacultyRow;
}

/**
 * Department options for the filter dropdown. `departments` has a
 * `using (true)` select policy for any authenticated user — same plain
 * catalog read as the students module and the rest of the app.
 */
export async function getFacultyFilterOptions(): Promise<FacultyFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("getFacultyFilterOptions departments failed:", error);
  }

  return { departments: data ?? [] };
}

export interface FacultyDetail {
  id: string;
  employee_number: string | null;
  name: string;
  email: string | null;
  designation: string;
  department_id: string | null;
  status: FacultyStatus;
  joined_date: string | null;
  profile_id: string | null;
}

export async function getFacultyById(id: string): Promise<FacultyDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faculty")
    .select("id, employee_number, name, email, designation, department_id, status, joined_date, profile_id")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as FacultyDetail;
}

export interface FacultyInput {
  employee_number: string | null;
  name: string;
  email: string | null;
  designation: string;
  department_id: string | null;
  status: FacultyStatus;
  joined_date: string | null;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is `faculty_insert_management` / `faculty_update_management`
 * (`has_role('management')`). profile_id is never set here — linking an
 * account is a separate, not-yet-built action (see Phase 6 report).
 */
export async function createFaculty(input: FacultyInput) {
  const supabase = await createClient();
  return supabase.from("faculty").insert(input).select("id").single();
}

export async function updateFaculty(id: string, input: FacultyInput) {
  const supabase = await createClient();
  return supabase.from("faculty").update(input).eq("id", id).select("id").single();
}

export async function setFacultyStatus(id: string, status: FacultyStatus) {
  const supabase = await createClient();
  return supabase.from("faculty").update({ status }).eq("id", id);
}
