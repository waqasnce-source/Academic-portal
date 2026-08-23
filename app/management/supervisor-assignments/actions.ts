"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  SUPERVISOR_ASSIGNMENT_ROLES,
  createSupervisorAssignment,
  endSupervisorAssignment,
  type SupervisorAssignmentRole,
} from "@/lib/management/supervisor-assignments";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";
import { syncStudentMilestoneByCode } from "@/lib/academic/milestone-sync";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  uq_supervisor_assignments_one_active_supervisor:
    "This student already has an active primary supervisor. End the existing assignment before adding a new one.",
  supervisor_assignments_student_id_fkey: "Selected student could not be found.",
  supervisor_assignments_faculty_id_fkey: "Selected faculty member could not be found.",
  supervisor_assignments_role_check: "Role must be Supervisor or Co-Supervisor.",
};

export interface SupervisorAssignmentFormState {
  error?: string;
}

function parseAssignmentInput(
  formData: FormData
):
  | { student_id: string; faculty_id: string; role: SupervisorAssignmentRole; start_date: string | null; remarks: string | null }
  | { error: string } {
  const studentId = String(formData.get("student_id") ?? "").trim();
  const facultyId = String(formData.get("faculty_id") ?? "").trim();
  const rawRole = String(formData.get("role") ?? "").trim();
  const rawStartDate = String(formData.get("start_date") ?? "").trim();
  const rawRemarks = String(formData.get("remarks") ?? "").trim();

  if (!UUID_RE.test(studentId)) return { error: "Please select a student." };
  if (!UUID_RE.test(facultyId)) return { error: "Please select a faculty member." };
  if (!(SUPERVISOR_ASSIGNMENT_ROLES as readonly string[]).includes(rawRole)) {
    return { error: "Role must be Supervisor or Co-Supervisor." };
  }
  if (rawRemarks.length > 2000) return { error: "Remarks must be 2000 characters or fewer." };

  return {
    student_id: studentId,
    faculty_id: facultyId,
    role: rawRole as SupervisorAssignmentRole,
    start_date: rawStartDate || null,
    remarks: rawRemarks || null,
  };
}

export async function createSupervisorAssignmentAction(
  _prevState: SupervisorAssignmentFormState | undefined,
  formData: FormData
): Promise<SupervisorAssignmentFormState> {
  await requireRole("management");

  const parsed = parseAssignmentInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createSupervisorAssignment(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  // SUPERVISOR_APPROVAL milestone sync: previously identified as a real,
  // documented gap (structured supervisor_assignments data existed but
  // never reached student_milestones). Only the primary 'supervisor' role
  // maps to this milestone — a co-supervisor assignment doesn't represent
  // "Supervisor Approval" on its own. Uses the exact same
  // syncStudentMilestoneByCode() mechanism every other workflow action in
  // this app already uses; no new sync system.
  if (parsed.role === "supervisor") {
    await syncStudentMilestoneByCode(parsed.student_id, ["SUPERVISOR_APPROVAL"], {
      status: "approved",
      completed_date: parsed.start_date ?? new Date().toISOString().slice(0, 10),
    });
  }

  revalidatePath("/management/supervisor-assignments");
  revalidatePath(`/management/academic-progress/${parsed.student_id}`);
  redirect("/management/supervisor-assignments");
}

export async function endSupervisorAssignmentAction(id: string) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;

  const today = new Date().toISOString().slice(0, 10);
  await endSupervisorAssignment(id, today);
  revalidatePath("/management/supervisor-assignments");
}
