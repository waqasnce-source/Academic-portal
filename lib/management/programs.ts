import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  PROGRAM_STATUSES,
  type ProgramStatus,
  DEGREE_LEVELS,
  type DegreeLevel,
} from "./status-enums";

export { PROGRAM_STATUSES, type ProgramStatus, DEGREE_LEVELS, type DegreeLevel };

export const PROGRAMS_PAGE_SIZE = 25;

export interface ProgramRow {
  id: string;
  code: string;
  name: string;
  degree_level: DegreeLevel;
  /** Nullable: no source-confirmed duration exists until an administrator enters and verifies one. */
  duration_years: number | null;
  duration_verified: boolean;
  status: ProgramStatus;
  created_at: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  /** Count of students with this program_id (students.program_id -> programs.id). */
  studentCount: number;
  /**
   * Count of program_courses rows for this program — i.e. how many
   * courses are mapped into this program's curriculum. Not the same
   * relationship as "courses in this department" (courses.department_id),
   * which is a different, unrelated FK.
   */
  courseCount: number;
}

/** Raw PostgREST shape before normalizing the embedded count aggregates. */
interface RawProgramRow {
  id: string;
  code: string;
  name: string;
  degree_level: DegreeLevel;
  duration_years: number | null;
  duration_verified: boolean;
  status: ProgramStatus;
  created_at: string;
  department: { id: string; code: string; name: string };
  students: { count: number }[] | null;
  program_courses: { count: number }[] | null;
}

export interface ProgramFilters {
  /** Searches both `code` and `name` on the programs table itself — same-table `.or()`, no cross-table restriction. */
  q: string;
  status: ProgramStatus | "";
  degreeLevel: DegreeLevel | "";
  departmentId: string;
  page: number;
}

export interface ProgramsResult {
  data: ProgramRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getPrograms(). */
  page: number;
  error: string | null;
}

export interface ProgramFilterOptions {
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
 * passed through to the query — same approach as students/faculty/departments.
 */
export function parseProgramFilters(
  searchParams: RawSearchParams
): ProgramFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (PROGRAM_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ProgramStatus)
    : "";

  const rawDegreeLevel = firstValue(searchParams.degree_level).trim();
  const degreeLevel = (DEGREE_LEVELS as readonly string[]).includes(rawDegreeLevel)
    ? (rawDegreeLevel as DegreeLevel)
    : "";

  const rawDepartment = firstValue(searchParams.department).trim();
  const departmentId = UUID_RE.test(rawDepartment) ? rawDepartment : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, status, degreeLevel, departmentId, page };
}

export function hasActiveProgramFilters(filters: ProgramFilters): boolean {
  return Boolean(
    filters.q || filters.status || filters.degreeLevel || filters.departmentId
  );
}

export function buildProgramsHref(filters: ProgramFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.degreeLevel) params.set("degree_level", filters.degreeLevel);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/programs?${qs}` : "/management/programs";
}

/**
 * `department:departments!inner(...)` mirrors faculty.ts's direct FK embed
 * (programs.department_id -> departments.id, single level, same as
 * faculty). `students(count)` and `program_courses(count)` are reverse-FK
 * embedded aggregates — same documented shape as departments.ts's counts
 * (`node_modules/@supabase/postgrest-js` PostgrestQueryBuilder.select()
 * JSDoc), each evaluated under the embedded table's own RLS
 * (`students_select_authenticated`, `program_courses_authenticated_select`).
 */
const PROGRAM_SELECT = `
  id,
  code,
  name,
  degree_level,
  duration_years,
  duration_verified,
  status,
  created_at,
  department:departments!inner ( id, code, name ),
  students(count),
  program_courses(count)
`;

function normalize(row: RawProgramRow): ProgramRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    degree_level: row.degree_level,
    duration_years: row.duration_years,
    duration_verified: row.duration_verified,
    status: row.status,
    created_at: row.created_at,
    department: row.department,
    studentCount: row.students?.[0]?.count ?? 0,
    courseCount: row.program_courses?.[0]?.count ?? 0,
  };
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `programs_authenticated_select` (`using (true)`) is the actual
 * enforcement for the program rows themselves; studentCount is
 * additionally gated by `students_select_authenticated` (true for a
 * management caller via `has_role('management')`), and courseCount by
 * `program_courses_authenticated_select` (`using (true)`).
 *
 * Counts programs first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in students.ts/faculty.ts/departments.ts.
 */
export async function getPrograms(
  filters: ProgramFilters
): Promise<ProgramsResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("programs")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.degreeLevel) countQuery = countQuery.eq("degree_level", filters.degreeLevel);
  if (filters.departmentId) countQuery = countQuery.eq("department_id", filters.departmentId);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getPrograms count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load program records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PROGRAMS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("programs").select(PROGRAM_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.degreeLevel) dataQuery = dataQuery.eq("degree_level", filters.degreeLevel);
  if (filters.departmentId) dataQuery = dataQuery.eq("department_id", filters.departmentId);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * PROGRAMS_PAGE_SIZE;
  const to = from + PROGRAMS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getPrograms data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load program records." };
  }

  return {
    data: ((data ?? []) as unknown as RawProgramRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

/**
 * Department options for the filter dropdown. `departments` has a
 * `using (true)` select policy for any authenticated user — same plain
 * catalog read as the students/faculty modules.
 */
export async function getProgramFilterOptions(): Promise<ProgramFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("getProgramFilterOptions departments failed:", error);
  }

  return { departments: data ?? [] };
}

export interface ProgramDetail {
  id: string;
  department_id: string;
  code: string;
  name: string;
  degree_level: DegreeLevel;
  duration_years: number | null;
  duration_verified: boolean;
  status: ProgramStatus;
}

export interface ProgramInput {
  department_id: string;
  code: string;
  name: string;
  degree_level: DegreeLevel;
  duration_years: number | null;
  duration_verified: boolean;
  status: ProgramStatus;
}

/** For the edit form's pre-fill — plain single-row read, same RLS as getPrograms(). */
export async function getProgramById(id: string): Promise<ProgramDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, department_id, code, name, degree_level, duration_years, duration_verified, status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as ProgramDetail;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is `programs_insert_management` /
 * `programs_update_management` (`has_role('management')`).
 */
export async function createProgram(input: ProgramInput) {
  const supabase = await createClient();
  return supabase.from("programs").insert(input).select("id").single();
}

export async function updateProgram(id: string, input: ProgramInput) {
  const supabase = await createClient();
  return supabase.from("programs").update(input).eq("id", id).select("id").single();
}

export async function setProgramStatus(id: string, status: ProgramStatus) {
  const supabase = await createClient();
  return supabase.from("programs").update({ status }).eq("id", id);
}
