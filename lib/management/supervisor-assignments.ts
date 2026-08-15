import "server-only";

import { createClient } from "@/lib/supabase/server";
import { SUPERVISOR_ASSIGNMENT_ROLES, type SupervisorAssignmentRole } from "./status-enums";

export { SUPERVISOR_ASSIGNMENT_ROLES, type SupervisorAssignmentRole };

export const SUPERVISOR_ASSIGNMENT_STATUSES = ["active", "inactive"] as const;
export type SupervisorAssignmentStatus = (typeof SUPERVISOR_ASSIGNMENT_STATUSES)[number];

export const SUPERVISOR_ASSIGNMENTS_PAGE_SIZE = 25;

export interface SupervisorAssignmentRow {
  id: string;
  role: SupervisorAssignmentRole;
  status: SupervisorAssignmentStatus;
  assigned_date: string;
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  student: {
    id: string;
    student_number: string;
    profile: { full_name: string } | null;
  };
  faculty: {
    id: string;
    name: string;
    designation: string;
  };
}

interface RawSupervisorAssignmentRow extends Omit<SupervisorAssignmentRow, "student" | "faculty"> {
  student: { id: string; student_number: string; profile: { full_name: string } | null };
  faculty: { id: string; name: string; designation: string };
}

export interface SupervisorAssignmentFilters {
  status: SupervisorAssignmentStatus | "";
  role: SupervisorAssignmentRole | "";
  page: number;
}

export interface SupervisorAssignmentsResult {
  data: SupervisorAssignmentRow[];
  count: number;
  page: number;
  error: string | null;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parseSupervisorAssignmentFilters(searchParams: RawSearchParams): SupervisorAssignmentFilters {
  const rawStatus = firstValue(searchParams.status).trim();
  const status = (SUPERVISOR_ASSIGNMENT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as SupervisorAssignmentStatus)
    : "";

  const rawRole = firstValue(searchParams.role).trim();
  const role = (SUPERVISOR_ASSIGNMENT_ROLES as readonly string[]).includes(rawRole)
    ? (rawRole as SupervisorAssignmentRole)
    : "";

  const rawPage = Number.parseInt(firstValue(searchParams.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  return { status, role, page };
}

export function hasActiveSupervisorAssignmentFilters(filters: SupervisorAssignmentFilters): boolean {
  return Boolean(filters.status || filters.role);
}

export function buildSupervisorAssignmentsHref(filters: SupervisorAssignmentFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/supervisor-assignments?${qs}` : "/management/supervisor-assignments";
}

const SUPERVISOR_ASSIGNMENT_SELECT = `
  id,
  role,
  status,
  assigned_date,
  start_date,
  end_date,
  remarks,
  student:students!inner ( id, student_number, profile:profiles ( full_name ) ),
  faculty:faculty!inner ( id, name, designation )
`;

export async function getSupervisorAssignments(
  filters: SupervisorAssignmentFilters
): Promise<SupervisorAssignmentsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("supervisor_assignments").select("id", { count: "exact", head: true });
  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.role) countQuery = countQuery.eq("role", filters.role);

  const { count, error: countError } = await countQuery;
  if (countError) {
    console.error("getSupervisorAssignments count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load supervisor assignment records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / SUPERVISOR_ASSIGNMENTS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("supervisor_assignments").select(SUPERVISOR_ASSIGNMENT_SELECT);
  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.role) dataQuery = dataQuery.eq("role", filters.role);

  const from = (safePage - 1) * SUPERVISOR_ASSIGNMENTS_PAGE_SIZE;
  const to = from + SUPERVISOR_ASSIGNMENTS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery.order("assigned_date", { ascending: false }).range(from, to);

  if (error) {
    console.error("getSupervisorAssignments data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load supervisor assignment records." };
  }

  return {
    data: (data ?? []) as unknown as RawSupervisorAssignmentRow[] as SupervisorAssignmentRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

export interface StudentOption {
  id: string;
  student_number: string;
  full_name: string;
}

export interface FacultyOption {
  id: string;
  name: string;
  designation: string;
}

/** Options for the assignment form's student/faculty selects. */
export async function getSupervisorAssignmentFormOptions(): Promise<{
  students: StudentOption[];
  faculty: FacultyOption[];
}> {
  const supabase = await createClient();

  const [{ data: students, error: studentsError }, { data: faculty, error: facultyError }] = await Promise.all([
    // Plain select (no join) — students.name is the authoritative display
    // name regardless of whether an account is linked (Phase 6), so no
    // embedded profiles lookup is needed here at all.
    supabase
      .from("students")
      .select("id, student_number, name")
      .eq("status", "active")
      .order("student_number"),
    supabase.from("faculty").select("id, name, designation").eq("status", "active").order("name"),
  ]);

  if (studentsError) console.error("getSupervisorAssignmentFormOptions students failed:", studentsError);
  if (facultyError) console.error("getSupervisorAssignmentFormOptions faculty failed:", facultyError);

  const studentOptions: StudentOption[] = (
    (students ?? []) as unknown as { id: string; student_number: string; name: string }[]
  ).map((s) => ({
    id: s.id,
    student_number: s.student_number,
    full_name: s.name,
  }));

  return { students: studentOptions, faculty: (faculty ?? []) as FacultyOption[] };
}

export interface SupervisorAssignmentInput {
  student_id: string;
  faculty_id: string;
  role: SupervisorAssignmentRole;
  start_date: string | null;
  remarks: string | null;
}

/**
 * Creates a new active assignment. Does not touch any prior assignment
 * row — uq_supervisor_assignments_one_active_supervisor will reject this
 * insert at the database level if the student already has an active
 * 'supervisor' role assignment, surfacing as a 23505 the caller maps via
 * toUserMessage(). To actually change supervisors: end the old assignment
 * first (endSupervisorAssignment), then create the new one.
 */
export async function createSupervisorAssignment(input: SupervisorAssignmentInput) {
  const supabase = await createClient();
  return supabase
    .from("supervisor_assignments")
    .insert({ ...input, status: "active" })
    .select("id")
    .single();
}

/** Marks an assignment inactive with an end_date — never deletes, per explicit instruction to preserve history. */
export async function endSupervisorAssignment(id: string, endDate: string) {
  const supabase = await createClient();
  return supabase
    .from("supervisor_assignments")
    .update({ status: "inactive", end_date: endDate })
    .eq("id", id);
}
