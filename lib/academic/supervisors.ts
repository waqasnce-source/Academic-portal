import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getStudentAcademicStatus, type StatusEngineResult } from "./status-engine";

export const SUPERVISOR_ASSIGNMENT_ROLES = ["supervisor", "co_supervisor"] as const;
export type SupervisorAssignmentRole = (typeof SUPERVISOR_ASSIGNMENT_ROLES)[number];

export const SUPERVISOR_ASSIGNMENT_STATUSES = ["active", "inactive"] as const;
export type SupervisorAssignmentStatus = (typeof SUPERVISOR_ASSIGNMENT_STATUSES)[number];

export interface SupervisorAssignmentRow {
  id: string;
  role: SupervisorAssignmentRole;
  status: SupervisorAssignmentStatus;
  assigned_date: string;
  start_date: string | null;
  end_date: string | null;
  remarks: string | null;
  faculty: {
    id: string;
    name: string;
    designation: string;
    email: string | null;
  };
}

const SUPERVISOR_ASSIGNMENT_SELECT = `
  id,
  role,
  status,
  assigned_date,
  start_date,
  end_date,
  remarks,
  faculty:faculty ( id, name, designation, email )
`;

/**
 * Full history for one student (active and inactive rows), most recent
 * assigned_date first — supervisor changes are preserved, never deleted
 * (see supervisor_assignments table comment in the Phase 3 migration).
 */
export async function getSupervisorAssignmentsForStudent(
  studentId: string
): Promise<SupervisorAssignmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .select(SUPERVISOR_ASSIGNMENT_SELECT)
    .eq("student_id", studentId)
    .order("assigned_date", { ascending: false });

  if (error) {
    console.error("getSupervisorAssignmentsForStudent failed:", error);
    return [];
  }
  return (data ?? []) as unknown as SupervisorAssignmentRow[];
}

/**
 * The current active primary supervisor, if any. At most one can exist
 * per student (uq_supervisor_assignments_one_active_supervisor).
 */
export async function getActiveSupervisor(
  studentId: string
): Promise<SupervisorAssignmentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .select(SUPERVISOR_ASSIGNMENT_SELECT)
    .eq("student_id", studentId)
    .eq("role", "supervisor")
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("getActiveSupervisor failed:", error);
    return null;
  }
  return data as unknown as SupervisorAssignmentRow | null;
}

/** All active co-supervisors (role = 'co_supervisor', status = 'active') for a student. */
export async function getActiveCoSupervisors(
  studentId: string
): Promise<SupervisorAssignmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supervisor_assignments")
    .select(SUPERVISOR_ASSIGNMENT_SELECT)
    .eq("student_id", studentId)
    .eq("role", "co_supervisor")
    .eq("status", "active")
    .order("assigned_date", { ascending: false });

  if (error) {
    console.error("getActiveCoSupervisors failed:", error);
    return [];
  }
  return (data ?? []) as unknown as SupervisorAssignmentRow[];
}

export interface SuperviseeRow {
  id: string;
  role: SupervisorAssignmentRole;
  status: SupervisorAssignmentStatus;
  assigned_date: string;
  student: {
    id: string;
    name: string;
    student_number: string;
    admission_year: number;
    profile: { full_name: string; email: string } | null;
    program: {
      id: string;
      code: string;
      name: string;
      degree_level: string;
      department: { id: string; name: string } | null;
    } | null;
    specialization: { id: string; name: string } | null;
  };
}

/**
 * For the Faculty dashboard/students list (and the Management faculty
 * hub's supervision section): every student a given faculty member
 * supervises or co-supervises, with enough of the program/discipline/
 * specialization chain embedded to support the Phase 4 filter
 * requirements (program, discipline, specialization) without a second
 * query per student. Relies entirely on RLS
 * (supervisor_assignments_select_authenticated) for authorization — this
 * function does not itself check the caller's identity, same convention
 * as every lib/management/*.ts read function.
 *
 * `includeInactive` defaults to false (active assignments only) so both
 * existing callers (the faculty self-service portal) are unaffected;
 * pass true for the Management faculty hub's "Show historical
 * supervision" toggle, which must not hide a genuinely active
 * relationship just because its assigned_date predates the currently
 * selected teaching session — that filter never applies here at all.
 */
export async function getSuperviseesForFaculty(
  facultyId: string,
  includeInactive = false
): Promise<SuperviseeRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("supervisor_assignments")
    .select(
      `
      id,
      role,
      status,
      assigned_date,
      student:students (
        id,
        name,
        student_number,
        admission_year,
        profile:profiles ( full_name, email ),
        program:programs ( id, code, name, degree_level, department:departments ( id, name ) ),
        specialization:specializations ( id, name )
      )
    `
    )
    .eq("faculty_id", facultyId);
  if (!includeInactive) query = query.eq("status", "active");

  const { data, error } = await query.order("assigned_date", { ascending: false });

  if (error) {
    console.error("getSuperviseesForFaculty failed:", error);
    return [];
  }
  return (data ?? []) as unknown as SuperviseeRow[];
}

export interface SuperviseeWithStatus extends SuperviseeRow {
  academicStatus: StatusEngineResult | null;
}

/**
 * Every supervisee (active-only by default) plus their computed academic
 * status, for the Faculty dashboard/students list and the Management
 * faculty hub. Computes computeAcademicStatus() per student (via
 * getStudentAcademicStatus) rather than caching/duplicating that logic —
 * acceptable N+1 fan-out at the current, small per-faculty supervisee
 * scale; revisit if that assumption stops holding.
 */
export async function getSuperviseesWithStatus(
  facultyId: string,
  includeInactive = false
): Promise<SuperviseeWithStatus[]> {
  const supervisees = await getSuperviseesForFaculty(facultyId, includeInactive);

  const statuses = await Promise.all(
    supervisees.map((s) => getStudentAcademicStatus(s.student.id))
  );

  return supervisees.map((s, i) => ({ ...s, academicStatus: statuses[i] }));
}
