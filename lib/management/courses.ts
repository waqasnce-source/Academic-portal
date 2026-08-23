import "server-only";

import { createClient } from "@/lib/supabase/server";
import { COURSE_STATUSES, type CourseStatus } from "./status-enums";

export { COURSE_STATUSES, type CourseStatus };

export const COURSES_PAGE_SIZE = 25;

export interface CourseRow {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
  status: CourseStatus;
  created_at: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  /** Count of program_courses rows for this course_id — how many programs' curricula include this course. */
  programCount: number;
  /** Count of course_offerings rows for this course_id — how many semester/section offerings exist. */
  offeringCount: number;
}

/** Raw PostgREST shape before normalizing the embedded count aggregates. */
interface RawCourseRow {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
  status: CourseStatus;
  created_at: string;
  department: { id: string; code: string; name: string };
  program_courses: { count: number }[] | null;
  course_offerings: { count: number }[] | null;
}

export interface CourseFilters {
  /** Searches both `code` and `name` on the courses table itself — same-table `.or()`, no cross-table restriction. */
  q: string;
  status: CourseStatus | "";
  departmentId: string;
  page: number;
}

export interface CoursesResult {
  data: CourseRow[];
  count: number;
  /** The page actually served — clamped to a valid range, see getCourses(). */
  page: number;
  error: string | null;
}

export interface CourseFilterOptions {
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
 * passed through to the query — same approach as students/faculty/
 * departments/programs.
 */
export function parseCourseFilters(
  searchParams: RawSearchParams
): CourseFilters {
  const q = firstValue(searchParams.q).trim().slice(0, 200);

  const rawStatus = firstValue(searchParams.status).trim();
  const status = (COURSE_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as CourseStatus)
    : "";

  const rawDepartment = firstValue(searchParams.department).trim();
  const departmentId = UUID_RE.test(rawDepartment) ? rawDepartment : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { q, status, departmentId, page };
}

export function hasActiveCourseFilters(filters: CourseFilters): boolean {
  return Boolean(filters.q || filters.status || filters.departmentId);
}

export function buildCoursesHref(filters: CourseFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/courses?${qs}` : "/management/courses";
}

/**
 * `department:departments!inner(...)` mirrors faculty.ts/programs.ts's
 * direct FK embed (courses.department_id -> departments.id, single
 * level). `program_courses(count)` and `course_offerings(count)` are
 * reverse-FK embedded aggregates — same documented shape confirmed for
 * departments.ts/programs.ts (node_modules/@supabase/postgrest-js
 * PostgrestQueryBuilder.select() JSDoc), each evaluated under the
 * embedded table's own RLS (`program_courses_authenticated_select`,
 * `course_offerings_select_authenticated` — both `using (true)`).
 *
 * programCount is deliberately NOT "courses in this department" — that
 * would conflate courses.department_id (an unrelated FK) with
 * program_courses.course_id (the actual curriculum-membership
 * relationship). offeringCount is how many course_offerings rows
 * (semester/section instances) exist for this course, not how many
 * students are enrolled in them — enrollments is a separate table this
 * module doesn't touch.
 */
const COURSE_SELECT = `
  id,
  code,
  name,
  credit_hours,
  status,
  created_at,
  department:departments!inner ( id, code, name ),
  program_courses(count),
  course_offerings(count)
`;

function normalize(row: RawCourseRow): CourseRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    credit_hours: row.credit_hours,
    status: row.status,
    created_at: row.created_at,
    department: row.department,
    programCount: row.program_courses?.[0]?.count ?? 0,
    offeringCount: row.course_offerings?.[0]?.count ?? 0,
  };
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `courses_select_authenticated` (`using (true)`) is the actual
 * enforcement for the course rows themselves; the two related counts are
 * separately RLS-gated per embedded table as described above.
 *
 * Counts courses first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in students.ts/faculty.ts/departments.ts/
 * programs.ts.
 */
export async function getCourses(
  filters: CourseFilters
): Promise<CoursesResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("courses")
    .select("id", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.departmentId) countQuery = countQuery.eq("department_id", filters.departmentId);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    countQuery = countQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getCourses count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load course records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / COURSES_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("courses").select(COURSE_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.departmentId) dataQuery = dataQuery.eq("department_id", filters.departmentId);
  if (filters.q) {
    const escaped = filters.q.replace(/[(),]/g, "");
    dataQuery = dataQuery.or(`code.ilike.%${escaped}%,name.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * COURSES_PAGE_SIZE;
  const to = from + COURSES_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("code", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getCourses data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load course records." };
  }

  return {
    data: ((data ?? []) as unknown as RawCourseRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

/**
 * Department options for the filter dropdown. `departments` has a
 * `using (true)` select policy for any authenticated user — same plain
 * catalog read as the students/faculty/programs modules.
 */
export async function getCourseFilterOptions(): Promise<CourseFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (error) {
    console.error("getCourseFilterOptions departments failed:", error);
  }

  return { departments: data ?? [] };
}

export interface CourseDetail {
  id: string;
  department_id: string;
  code: string;
  name: string;
  credit_hours: number;
  status: CourseStatus;
}

export interface CourseInput {
  department_id: string;
  code: string;
  name: string;
  credit_hours: number;
  status: CourseStatus;
}

/** For the edit form's pre-fill — plain single-row read, same RLS as getCourses(). */
export async function getCourseById(id: string): Promise<CourseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, department_id, code, name, credit_hours, status")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as CourseDetail;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is `courses_insert_management` / `courses_update_management`
 * (`has_role('management')`).
 */
export async function createCourse(input: CourseInput) {
  const supabase = await createClient();
  return supabase.from("courses").insert(input).select("id").single();
}

export async function updateCourse(id: string, input: CourseInput) {
  const supabase = await createClient();
  return supabase.from("courses").update(input).eq("id", id).select("id").single();
}

export async function setCourseStatus(id: string, status: CourseStatus) {
  const supabase = await createClient();
  return supabase.from("courses").update({ status }).eq("id", id);
}

export interface CourseOption {
  id: string;
  code: string;
  name: string;
  credit_hours: number;
}

/** Case/whitespace-insensitive lookup for the "course already exists" duplicate check ahead of creating a new course — courses.code's uniqueness is DB-enforced regardless, but a pre-check lets the UI point straight at the existing course instead of surfacing a raw constraint error. */
export async function findCourseByCode(code: string): Promise<{ id: string; code: string; name: string } | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, code, name")
    .ilike("code", trimmed)
    .maybeSingle();
  return data;
}

/** How many course_offerings reference this course — used to warn before editing a course that already has historical offerings (see the edit form). */
export async function getCourseOfferingCount(courseId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("course_offerings")
    .select("id", { count: "exact", head: true })
    .eq("course_id", courseId);
  return count ?? 0;
}

/** Active courses for a select input — shared by the curriculum-requirement form and the course-offering form. */
export async function getCourseOptions(): Promise<CourseOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, code, name, credit_hours")
    .eq("status", "active")
    .order("code");

  if (error) {
    console.error("getCourseOptions failed:", error);
    return [];
  }
  return (data ?? []) as CourseOption[];
}
