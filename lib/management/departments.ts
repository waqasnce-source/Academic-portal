import "server-only";

import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_STATUSES, type DepartmentStatus } from "./status-enums";

export { DEPARTMENT_STATUSES, type DepartmentStatus };

export const DEPARTMENTS_PAGE_SIZE = 25;

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  status: DepartmentStatus;
  created_at: string;
  /** Count of programs/faculty/courses with this department_id (all rows, not filtered by their own status). */
  programCount: number;
  facultyCount: number;
  courseCount: number;
}

/** Raw PostgREST shape before normalizing the embedded count aggregates. */
interface RawDepartmentRow {
  id: string;
  code: string;
  name: string;
  status: DepartmentStatus;
  created_at: string;
  programs: { count: number }[] | null;
  faculty: { count: number }[] | null;
  courses: { count: number }[] | null;
}

export interface DepartmentFilters {
  /** Searches both `code` and `name` — both live on the departments table itself, so a plain same-table `.or()` applies (no cross-table OR restriction here). */
  q: string;
  status: DepartmentStatus | "";
  page: number;
}

export interface DepartmentsResult {
  data: DepartmentRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getDepartments(). */
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
 * passed through to the query — same approach as students/faculty.
 */
export function parseDepartmentFilters(
  searchParams: RawSearchParams
): DepartmentFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (DEPARTMENT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as DepartmentStatus)
    : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, status, page };
}

export function hasActiveDepartmentFilters(filters: DepartmentFilters): boolean {
  return Boolean(filters.q || filters.status);
}

export function buildDepartmentsHref(
  filters: DepartmentFilters,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/departments?${qs}` : "/management/departments";
}

/**
 * `programs(count)`, `faculty(count)`, `courses(count)` are PostgREST
 * embedded aggregate counts — confirmed against the exact shape documented
 * in node_modules/@supabase/postgrest-js's PostgrestQueryBuilder.select()
 * JSDoc (`@exampleResponse "Querying referenced table with count"`):
 * each resolves to a one-element array `[{ count: N }]`. Each embed is
 * evaluated under that table's own RLS (`programs_authenticated_select`,
 * `faculty_select_authenticated`, `courses_select_authenticated`), the
 * same way the main data embeds in students.ts/faculty.ts already are —
 * so these counts are exactly what a management caller is allowed to see,
 * not an unfiltered global count.
 */
const DEPARTMENT_SELECT = `
  id,
  code,
  name,
  status,
  created_at,
  programs(count),
  faculty(count),
  courses(count)
`;

function normalize(row: RawDepartmentRow): DepartmentRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    created_at: row.created_at,
    programCount: row.programs?.[0]?.count ?? 0,
    facultyCount: row.faculty?.[0]?.count ?? 0,
    courseCount: row.courses?.[0]?.count ?? 0,
  };
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `departments_select_authenticated` (`using (true)` — any authenticated
 * user) is the actual enforcement for the department rows themselves; the
 * three related counts are separately RLS-gated per embedded table as
 * described above.
 *
 * Counts departments first (head-only, no `.range()`, no count embeds —
 * those aren't needed just to know how many department rows match) and
 * clamps the requested page to the real last page before issuing the
 * ranged data query — same fix applied in students.ts/faculty.ts after a
 * huge/stale `page` value was found to make PostgREST reject the range
 * outright.
 */
export async function getDepartments(
  filters: DepartmentFilters
): Promise<DepartmentsResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("departments")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getDepartments count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load department records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / DEPARTMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("departments").select(DEPARTMENT_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * DEPARTMENTS_PAGE_SIZE;
  const to = from + DEPARTMENTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getDepartments data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load department records." };
  }

  return {
    data: ((data ?? []) as unknown as RawDepartmentRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface DepartmentDetail {
  id: string;
  code: string;
  name: string;
  status: DepartmentStatus;
}

export interface DepartmentInput {
  code: string;
  name: string;
  status: DepartmentStatus;
}

/** For the edit form's pre-fill — plain single-row read, same RLS as getDepartments(). */
export async function getDepartmentById(id: string): Promise<DepartmentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("departments")
    .select("id, code, name, status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as DepartmentDetail;
}

/**
 * Raw mutation helpers — deliberately return the Supabase response as-is
 * (not a normalized result) so the calling Server Action can map `error`
 * through toUserMessage() with its own constraint-name dictionary. RLS
 * enforcement is `departments_insert_management` /
 * `departments_update_management` (`has_role('management')`).
 */
export async function createDepartment(input: DepartmentInput) {
  const supabase = await createClient();
  return supabase.from("departments").insert(input).select("id").single();
}

export async function updateDepartment(id: string, input: DepartmentInput) {
  const supabase = await createClient();
  return supabase.from("departments").update(input).eq("id", id).select("id").single();
}

export async function setDepartmentStatus(id: string, status: DepartmentStatus) {
  const supabase = await createClient();
  return supabase.from("departments").update({ status }).eq("id", id);
}
