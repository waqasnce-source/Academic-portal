import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STUDENT_MILESTONE_STATUSES, type StudentMilestoneStatus } from "./status-enums";

export { STUDENT_MILESTONE_STATUSES, type StudentMilestoneStatus };

/** Statuses that count as "done" for progress/completion purposes. */
export const TERMINAL_GOOD_STATUSES: readonly StudentMilestoneStatus[] = [
  "completed",
  "approved",
  "waived",
  "not_applicable",
];

/** Mirrors milestone_templates.degree_level's CHECK constraint exactly (same values as programs.degree_level). */
export const MILESTONE_DEGREE_LEVELS = ["diploma", "bachelor", "master", "phd"] as const;
export type MilestoneDegreeLevel = (typeof MILESTONE_DEGREE_LEVELS)[number];

export const PHD_ENTRY_BASIS_VALUES = ["ms_mphil_llm", "bs_master"] as const;
export type PhdEntryBasis = (typeof PHD_ENTRY_BASIS_VALUES)[number];

export interface MilestoneTemplateRow {
  id: string;
  milestone_code: string;
  title: string;
  description: string | null;
  sequence_no: number;
  required: boolean;
  target_semester: number | null;
  target_days_after_admission: number | null;
  target_days_after_prerequisite: number | null;
  prerequisite_milestone_id: string | null;
  category: string | null;
}

const MILESTONE_TEMPLATE_SELECT = `
  id,
  milestone_code,
  title,
  description,
  sequence_no,
  required,
  target_semester,
  target_days_after_admission,
  target_days_after_prerequisite,
  prerequisite_milestone_id,
  category
`;

/**
 * The templates applicable to one student: matched on degree_level, and
 * on applicable_entry_basis (a template with null applies to every
 * student at that degree_level; a non-null value only matches a student
 * whose own phd_entry_basis equals it — see the Phase 3 migration's fork
 * design). program_id-specific templates are also included when set,
 * alongside the program_id-null "applies to every program" templates.
 * Ordered by sequence_no, which is the authoritative display/progress
 * order (see docs/database-design.md §15.5 on why prerequisite_milestone_id
 * cannot always serve that role at PhD fork/merge points).
 */
export async function getApplicableMilestoneTemplates(
  degreeLevel: MilestoneDegreeLevel,
  programId: string | null,
  phdEntryBasis: PhdEntryBasis | null
): Promise<MilestoneTemplateRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("milestone_templates")
    .select(MILESTONE_TEMPLATE_SELECT)
    .eq("degree_level", degreeLevel)
    .eq("is_active", true);

  query = programId ? query.or(`program_id.is.null,program_id.eq.${programId}`) : query.is("program_id", null);

  query = phdEntryBasis
    ? query.or(`applicable_entry_basis.is.null,applicable_entry_basis.eq.${phdEntryBasis}`)
    : query.is("applicable_entry_basis", null);

  const { data, error } = await query.order("sequence_no", { ascending: true });

  if (error) {
    console.error("getApplicableMilestoneTemplates failed:", error);
    return [];
  }
  return (data ?? []) as MilestoneTemplateRow[];
}

export interface StudentMilestoneRow {
  id: string;
  milestone_template_id: string;
  status: StudentMilestoneStatus;
  planned_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  verified_date: string | null;
  verified_by: string | null;
  remarks: string | null;
}

const STUDENT_MILESTONE_SELECT = `
  id,
  milestone_template_id,
  status,
  planned_date,
  due_date,
  completed_date,
  verified_date,
  verified_by,
  remarks
`;

/** Raw student_milestones rows for one student — one row per template that has actually been instantiated. */
export async function getStudentMilestoneRecords(studentId: string): Promise<StudentMilestoneRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_milestones")
    .select(STUDENT_MILESTONE_SELECT)
    .eq("student_id", studentId);

  if (error) {
    console.error("getStudentMilestoneRecords failed:", error);
    return [];
  }
  return (data ?? []) as StudentMilestoneRow[];
}

export interface EffectiveMilestone extends MilestoneTemplateRow {
  /** Null when no student_milestones row exists yet for this template — treated as 'not_started'. */
  record: StudentMilestoneRow | null;
  status: StudentMilestoneStatus;
}

/**
 * Merges a student's applicable templates with their actual
 * student_milestones records. A template with no corresponding record
 * yet is synthesized as 'not_started' rather than requiring every
 * student to have a pre-created row per template — the roadmap is
 * defined by milestone_templates; instantiation into student_milestones
 * happens as a student actually begins each step.
 */
export function buildEffectiveMilestones(
  templates: MilestoneTemplateRow[],
  records: StudentMilestoneRow[]
): EffectiveMilestone[] {
  const byTemplateId = new Map(records.map((r) => [r.milestone_template_id, r]));

  return templates.map((template) => {
    const record = byTemplateId.get(template.id) ?? null;
    return {
      ...template,
      record,
      status: record?.status ?? "not_started",
    };
  });
}

/** Convenience: applicable templates + actual records, already merged, for one student. */
export async function getEffectiveMilestonesForStudent(
  studentId: string,
  degreeLevel: MilestoneDegreeLevel,
  programId: string | null,
  phdEntryBasis: PhdEntryBasis | null
): Promise<EffectiveMilestone[]> {
  const [templates, records] = await Promise.all([
    getApplicableMilestoneTemplates(degreeLevel, programId, phdEntryBasis),
    getStudentMilestoneRecords(studentId),
  ]);
  return buildEffectiveMilestones(templates, records);
}
