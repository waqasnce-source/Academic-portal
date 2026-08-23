"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { STUDENT_MILESTONE_STATUSES } from "@/lib/academic/status-enums";
import { upsertStudentMilestoneRecord } from "@/lib/academic/milestone-sync";
import { UUID_RE } from "@/lib/management/query-params";

export interface MilestoneUpdateState {
  error?: string;
  message?: string;
}

/**
 * The management counterpart to app/faculty/students/[id]/actions.ts's
 * updateStudentMilestoneAction — same upsertStudentMilestoneRecord() write
 * path, no new override mechanism invented. Unlike the faculty action,
 * there is no supervisee-membership check here: RLS itself already grants
 * `get_my_role() = 'management'` unconditional insert/update on
 * student_milestones (student_milestones_faculty_insert/_faculty_update —
 * confirmed by inspecting the live policies before writing this), the
 * same unrestricted access every other management mutation in this
 * codebase already has. This applies equally to milestones whose status
 * is normally kept in sync automatically (e.g. THESIS_SUBMISSION via
 * syncStudentMilestoneByCode from the Thesis module) — the existing
 * architecture already permits that override at the RLS layer, so this
 * does not add a new one; see the Academic Progress delivery report for
 * the full reasoning.
 */
export async function updateStudentMilestoneAction(
  studentId: string,
  milestoneTemplateId: string,
  _prevState: MilestoneUpdateState | undefined,
  formData: FormData
): Promise<MilestoneUpdateState> {
  await requireRole("management");

  if (!UUID_RE.test(studentId) || !UUID_RE.test(milestoneTemplateId)) {
    return { error: "Invalid request." };
  }

  const rawStatus = String(formData.get("status") ?? "").trim();
  if (!(STUDENT_MILESTONE_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Invalid status value." };
  }

  const rawPlannedDate = String(formData.get("planned_date") ?? "").trim();
  const rawDueDate = String(formData.get("due_date") ?? "").trim();
  const rawCompletedDate = String(formData.get("completed_date") ?? "").trim();
  const rawRemarks = String(formData.get("remarks") ?? "").trim();
  if (rawRemarks.length > 2000) return { error: "Remarks must be 2000 characters or fewer." };

  const { error } = await upsertStudentMilestoneRecord(studentId, milestoneTemplateId, {
    status: rawStatus as (typeof STUDENT_MILESTONE_STATUSES)[number],
    planned_date: rawPlannedDate || null,
    due_date: rawDueDate || null,
    completed_date: rawCompletedDate || null,
    remarks: rawRemarks || null,
  });

  if (error) {
    console.error("updateStudentMilestoneAction (management) failed:", error);
    return { error: "Could not save changes. Please try again." };
  }

  revalidatePath(`/management/academic-progress/${studentId}`);
  revalidatePath("/management/academic-progress");
  return { message: "Milestone updated." };
}
