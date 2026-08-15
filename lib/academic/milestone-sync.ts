import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getApplicableMilestoneTemplates,
  type MilestoneDegreeLevel,
  type PhdEntryBasis,
} from "./milestones";
import type { StudentMilestoneStatus } from "./status-enums";

export interface StudentMilestoneContext {
  degreeLevel: MilestoneDegreeLevel;
  programId: string | null;
  phdEntryBasis: PhdEntryBasis | null;
}

/**
 * The (degree_level, program_id, phd_entry_basis) triple needed to resolve
 * which milestone_templates apply to a student — the same shape
 * getStudentAcademicStatus() resolves inline. Factored out here so the
 * milestone-sync helpers below (and any future caller) don't repeat that
 * query.
 */
export async function getStudentMilestoneContext(
  studentId: string
): Promise<StudentMilestoneContext | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("phd_entry_basis, program:programs ( id, degree_level )")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !data) return null;

  const program = data.program as unknown as { id: string; degree_level: MilestoneDegreeLevel } | null;
  if (!program) return null;

  return {
    degreeLevel: program.degree_level,
    programId: program.id,
    phdEntryBasis: (data.phd_entry_basis as PhdEntryBasis | null) ?? null,
  };
}

export interface MilestoneSyncUpdate {
  status: StudentMilestoneStatus;
  due_date?: string | null;
  completed_date?: string | null;
  verified_date?: string | null;
  verified_by?: string | null;
  remarks?: string | null;
}

/**
 * Upserts one student_milestones row for a template that has already been
 * resolved (the caller already knows milestone_template_id). This is the
 * exact upsert previously inlined in
 * app/faculty/students/[id]/actions.ts#updateStudentMilestoneAction — that
 * action now calls this instead so the write pattern exists in one place.
 */
export async function upsertStudentMilestoneRecord(
  studentId: string,
  milestoneTemplateId: string,
  update: MilestoneSyncUpdate
) {
  const supabase = await createClient();
  return supabase.from("student_milestones").upsert(
    {
      student_id: studentId,
      milestone_template_id: milestoneTemplateId,
      ...update,
    },
    { onConflict: "student_id,milestone_template_id" }
  );
}

/**
 * Upserts student_milestones for whichever of the given milestone_codes
 * applies to this student. Multiple codes exist because MS/MPhil and PhD
 * templates sometimes use different codes for the same lifecycle step
 * (e.g. 'VIVA_VOCE' vs 'DEFENCE_VIVA_VOCE') — pass every acceptable code
 * and whichever one is actually in the student's applicable template set
 * is used.
 *
 * Silently no-ops (logging only) if the student has no matching template —
 * a milestone-sync failure must never block the primary workflow action
 * (e.g. recording a thesis submission) it is attached to.
 */
export async function syncStudentMilestoneByCode(
  studentId: string,
  milestoneCodes: string[],
  update: MilestoneSyncUpdate
): Promise<void> {
  const context = await getStudentMilestoneContext(studentId);
  if (!context) {
    console.error(`syncStudentMilestoneByCode: no milestone context for student ${studentId}`);
    return;
  }

  const templates = await getApplicableMilestoneTemplates(
    context.degreeLevel,
    context.programId,
    context.phdEntryBasis
  );
  const template = templates.find((t) => milestoneCodes.includes(t.milestone_code));
  if (!template) {
    console.error(
      `syncStudentMilestoneByCode: no applicable template for student ${studentId} among codes [${milestoneCodes.join(", ")}]`
    );
    return;
  }

  const { error } = await upsertStudentMilestoneRecord(studentId, template.id, update);
  if (error) {
    console.error("syncStudentMilestoneByCode: upsert failed:", error);
  }
}
