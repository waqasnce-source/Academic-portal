import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MilestoneDegreeLevel, PhdEntryBasis } from "./milestones";
import type { RequirementCategory } from "@/lib/management/status-enums";

export type { RequirementCategory };

export interface CurriculumRequirementRow {
  id: string;
  requirement_category: RequirementCategory;
  course_id: string | null;
  required_credit_hours: number | null;
  is_mandatory: boolean;
  course: { id: string; code: string; name: string; credit_hours: number } | null;
}

const APPLICABLE_REQUIREMENT_SELECT = `
  id,
  requirement_category,
  course_id,
  required_credit_hours,
  is_mandatory,
  course:courses ( id, code, name, credit_hours )
`;

/**
 * Every curriculum_requirements row that applies to one student: scoped
 * to their program, and further narrowed to rows whose specialization_id
 * is null (applies to the whole program) or matches the student's own
 * specialization, and whose applicable_entry_basis is null (applies
 * regardless of PhD track) or matches the student's own
 * phd_entry_basis — the exact same nullable-scoping semantics already
 * enforced by curriculum_requirements_select_authenticated's student
 * branch (Phase 8B). Reads through the normal RLS-respecting client, so
 * a student caller and a management caller both get the applicable set;
 * RLS additionally restricts a student caller to only their own program
 * in the first place.
 */
export async function getApplicableCurriculumRequirements(
  programId: string,
  specializationId: string | null,
  phdEntryBasis: PhdEntryBasis | null
): Promise<CurriculumRequirementRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("curriculum_requirements")
    .select(APPLICABLE_REQUIREMENT_SELECT)
    .eq("program_id", programId);

  query = specializationId
    ? query.or(`specialization_id.is.null,specialization_id.eq.${specializationId}`)
    : query.is("specialization_id", null);

  query = phdEntryBasis
    ? query.or(`applicable_entry_basis.is.null,applicable_entry_basis.eq.${phdEntryBasis}`)
    : query.is("applicable_entry_basis", null);

  const { data, error } = await query;

  if (error) {
    console.error("getApplicableCurriculumRequirements failed:", error);
    return [];
  }
  return (data ?? []) as unknown as CurriculumRequirementRow[];
}

/** Whether ANY curriculum_requirements row exists for a program at all, regardless of specialization/entry-basis scoping — the "not configured at all" vs "configured but not for this student's track" distinction degree-audit needs. */
export async function programHasAnyCurriculumConfigured(programId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("curriculum_requirements")
    .select("id", { count: "exact", head: true })
    .eq("program_id", programId);

  if (error) {
    console.error("programHasAnyCurriculumConfigured failed:", error);
    return false;
  }
  return (count ?? 0) > 0;
}

export type { MilestoneDegreeLevel, PhdEntryBasis };
