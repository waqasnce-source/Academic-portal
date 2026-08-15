import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseEnumValue,
  parseUuid,
  parsePage,
  parseText,
  escapeIlike,
} from "@/lib/management/query-params";
import {
  OFFERING_STATUSES,
  type OfferingStatus,
  COURSE_OFFERING_FACULTY_ROLES,
  type CourseOfferingFacultyRole,
} from "./status-enums";

export { OFFERING_STATUSES, type OfferingStatus, COURSE_OFFERING_FACULTY_ROLES, type CourseOfferingFacultyRole };

export const OFFERINGS_PAGE_SIZE = 25;

export interface CourseOfferingRow {
  id: string;
  section: string;
  capacity: number | null;
  status: OfferingStatus;
  created_at: string;
  course: { id: string; code: string; name: string };
  semester: { id: string; name: string; academic_year: string };
  /** Assigned instructor names, primary first — empty when unassigned ("TBA", a valid state). */
  facultyNames: string[];
  /** enrollments rows for this offering, any status. */
  enrollmentCount: number;
}

interface RawCourseOfferingRow {
  id: string;
  section: string;
  capacity: number | null;
  status: OfferingStatus;
  created_at: string;
  course: { id: string; code: string; name: string };
  semester: { id: string; name: string; academic_year: string };
  course_offering_faculty: {
    role: string;
    faculty: { name: string; profile: { full_name: string } | null };
  }[];
  enrollments: { count: number }[] | null;
}

export interface CourseOfferingFilters {
  /** Searches the embedded course's code/name (referencedTable-scoped `.or()`). */
  q: string;
  status: OfferingStatus | "";
  semesterId: string;
  page: number;
}

export interface CourseOfferingsResult {
  data: CourseOfferingRow[];
  count: number;
  page: number;
  error: string | null;
}

export interface CourseOfferingFilterOptions {
  semesters: { id: string; name: string; academic_year: string }[];
}

export function parseCourseOfferingFilters(
  searchParams: RawSearchParams
): CourseOfferingFilters {
  return {
    q: parseText(searchParams.q),
    status: parseEnumValue(searchParams.status, OFFERING_STATUSES),
    semesterId: parseUuid(searchParams.semester),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveCourseOfferingFilters(filters: CourseOfferingFilters): boolean {
  return Boolean(filters.q || filters.status || filters.semesterId);
}

export function buildCourseOfferingsHref(
  filters: CourseOfferingFilters,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.semesterId) params.set("semester", filters.semesterId);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/course-offerings?${qs}` : "/management/course-offerings";
}

/**
 * `course:courses!inner(...)` and `semester:semesters!inner(...)` are
 * direct FK embeds (course_offerings.course_id -> courses.id,
 * course_offerings.semester_id -> semesters.id). `course_offering_faculty(count)`
 * and `enrollments(count)` are reverse-FK embedded aggregates, evaluated
 * under each table's own RLS: `course_offering_faculty_self_select`
 * (`faculty_id = get_my_faculty_id() OR management` — full count for a
 * management caller) and `enrollments_select_authenticated`
 * (`has_role('management') OR ...` — likewise full count).
 */
const OFFERING_SELECT = `
  id,
  section,
  capacity,
  status,
  created_at,
  course:courses!inner ( id, code, name ),
  semester:semesters!inner ( id, name, academic_year ),
  course_offering_faculty ( role, faculty:faculty!inner ( name, profile:profiles ( full_name ) ) ),
  enrollments(count)
`;

const FACULTY_ROLE_ORDER: Record<string, number> = { primary: 0, co_instructor: 1, lab_instructor: 2 };

function normalize(row: RawCourseOfferingRow): CourseOfferingRow {
  const facultyNames = [...row.course_offering_faculty]
    .sort((a, b) => (FACULTY_ROLE_ORDER[a.role] ?? 9) - (FACULTY_ROLE_ORDER[b.role] ?? 9))
    .map((f) => f.faculty.profile?.full_name ?? f.faculty.name);

  return {
    id: row.id,
    section: row.section,
    capacity: row.capacity,
    status: row.status,
    created_at: row.created_at,
    course: row.course,
    semester: row.semester,
    facultyNames,
    enrollmentCount: row.enrollments?.[0]?.count ?? 0,
  };
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `course_offerings_select_authenticated` (`using (true)`) is the actual
 * enforcement for the offering rows themselves.
 *
 * Counts offerings first (head-only, no `.range()`, no embeds) and clamps
 * the requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getCourseOfferings(
  filters: CourseOfferingFilters
): Promise<CourseOfferingsResult> {
  const supabase = await createClient();

  let countQuery = supabase
    .from("course_offerings")
    .select("id, course:courses!inner(id)", { count: "exact", head: true });

  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.semesterId) countQuery = countQuery.eq("semester_id", filters.semesterId);
  if (filters.q) {
    countQuery = countQuery.or(
      `code.ilike.%${escapeIlike(filters.q)}%,name.ilike.%${escapeIlike(filters.q)}%`,
      { referencedTable: "course" }
    );
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getCourseOfferings count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load course offering records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / OFFERINGS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("course_offerings").select(OFFERING_SELECT);

  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.semesterId) dataQuery = dataQuery.eq("semester_id", filters.semesterId);
  if (filters.q) {
    dataQuery = dataQuery.or(
      `code.ilike.%${escapeIlike(filters.q)}%,name.ilike.%${escapeIlike(filters.q)}%`,
      { referencedTable: "course" }
    );
  }

  const from = (safePage - 1) * OFFERINGS_PAGE_SIZE;
  const to = from + OFFERINGS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getCourseOfferings data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load course offering records." };
  }

  return {
    data: ((data ?? []) as unknown as RawCourseOfferingRow[]).map(normalize),
    count: totalCount,
    page: safePage,
    error: null,
  };
}

/** Semester options for the filter dropdown — `using (true)` for any authenticated user. Also reused as the create/edit form's semester select (all semesters, not just ongoing — a 'planned' offering is commonly created for an 'upcoming' semester). */
export async function getCourseOfferingFilterOptions(): Promise<CourseOfferingFilterOptions> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("semesters")
    .select("id, name, academic_year")
    .order("start_date", { ascending: false });

  if (error) {
    console.error("getCourseOfferingFilterOptions semesters failed:", error);
  }

  return { semesters: data ?? [] };
}

export interface OfferingOption {
  id: string;
  section: string;
  status: OfferingStatus;
  capacity: number | null;
  course: { code: string; name: string };
  semester: { name: string; academic_year: string };
}

/** Non-cancelled offerings, for the enrollment-create form's offering select — a cancelled offering is excluded up front rather than merely flagged, since enrolling into one is never valid. */
export async function getEnrollableOfferingOptions(): Promise<OfferingOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(
      `id, section, status, capacity,
       course:courses!inner ( code, name ),
       semester:semesters!inner ( name, academic_year )`
    )
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getEnrollableOfferingOptions failed:", error);
    return [];
  }
  return (data ?? []) as unknown as OfferingOption[];
}

export interface CourseOfferingDetail {
  id: string;
  course_id: string;
  semester_id: string;
  section: string;
  capacity: number | null;
  status: OfferingStatus;
  /** For display context on the edit page — the course/semester don't change identity via this form, only section/capacity/status do. */
  course: { code: string; name: string; status: string };
  semester: { name: string; academic_year: string };
}

const OFFERING_DETAIL_SELECT = `
  id,
  course_id,
  semester_id,
  section,
  capacity,
  status,
  course:courses!inner ( code, name, status ),
  semester:semesters!inner ( name, academic_year )
`;

export async function getCourseOfferingById(id: string): Promise<CourseOfferingDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offerings")
    .select(OFFERING_DETAIL_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as unknown as CourseOfferingDetail;
}

export interface CourseOfferingInput {
  course_id: string;
  semester_id: string;
  section: string;
  capacity: number | null;
  status: OfferingStatus;
}

/**
 * Raw mutation helpers — return the Supabase response as-is so the
 * calling Server Action can map `error` through toUserMessage(). RLS
 * enforcement is course_offerings_insert_management /
 * _update_management (has_role('management')). The database's own
 * `unique (course_id, semester_id, section)` constraint is the actual
 * duplicate-offering guard (surfaces as 23505); the course/semester FKs
 * are `on delete restrict`, so a nonexistent course_id/semester_id
 * surfaces as 23503 — both mapped by the calling Server Action's
 * CONSTRAINT_MESSAGES, not re-validated here.
 */
export async function createCourseOffering(input: CourseOfferingInput) {
  const supabase = await createClient();
  return supabase.from("course_offerings").insert(input).select("id").single();
}

export async function updateCourseOffering(id: string, input: CourseOfferingInput) {
  const supabase = await createClient();
  return supabase.from("course_offerings").update(input).eq("id", id).select("id").single();
}

// ---- Faculty assignment (course_offering_faculty — the sole teaching relationship; never supervisor_assignments) ----

export interface CourseOfferingFacultyRow {
  id: string;
  role: CourseOfferingFacultyRole;
  faculty: { id: string; name: string; profile: { full_name: string } | null };
}

/**
 * `profile:profiles` is a PLAIN embed, not `!inner` — faculty.profile_id
 * is nullable (Phase 3), so an `!inner` here would silently drop a
 * profile-less faculty member's assignment row from this list entirely,
 * the same hazard fixed across enrollments.ts/attendance.ts/results.ts/
 * teaching-load.ts in Phase 8B. `name` is the fallback display identity.
 */
const OFFERING_FACULTY_SELECT = `
  id,
  role,
  faculty:faculty!inner ( id, name, profile:profiles ( full_name ) )
`;

export async function getCourseOfferingFacultyAssignments(
  offeringId: string
): Promise<CourseOfferingFacultyRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_offering_faculty")
    .select(OFFERING_FACULTY_SELECT)
    .eq("course_offering_id", offeringId)
    .order("role");

  if (error) {
    console.error("getCourseOfferingFacultyAssignments failed:", error);
    return [];
  }
  return (data ?? []) as unknown as CourseOfferingFacultyRow[];
}

/**
 * RLS enforcement is course_offering_faculty_insert_management
 * (has_role('management')). The database's own partial unique index
 * (`course_offering_id) WHERE role = 'primary'`) is the actual
 * single-primary-instructor guard (surfaces as 23505); `unique
 * (course_offering_id, faculty_id)` prevents assigning the same faculty
 * member twice to one offering regardless of role.
 */
export async function assignFacultyToOffering(
  offeringId: string,
  facultyId: string,
  role: CourseOfferingFacultyRole
) {
  const supabase = await createClient();
  return supabase
    .from("course_offering_faculty")
    .insert({ course_offering_id: offeringId, faculty_id: facultyId, role })
    .select("id")
    .single();
}

/**
 * course_offering_faculty has no status/end_date column (unlike
 * supervisor_assignments, which preserves history via an inactive row) —
 * "ending" an assignment is therefore a hard delete, with no historical
 * trace of who used to teach an offering. This is a genuine, documented
 * limitation of the existing schema (see docs/database-design.md Phase
 * 8C addendum), not a gap papered over: adding a history mechanism here
 * was explicitly out of scope unless proven necessary, and reusing the
 * table as-is was the instructed default.
 */
export async function removeFacultyAssignment(assignmentId: string) {
  const supabase = await createClient();
  return supabase.from("course_offering_faculty").delete().eq("id", assignmentId);
}
