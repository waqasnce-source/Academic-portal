"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  createCurriculumRequirement,
  updateCurriculumRequirement,
  deleteCurriculumRequirement,
  REQUIREMENT_CATEGORIES,
  PHD_ENTRY_BASIS_VALUES,
  type CurriculumRequirementInput,
  type RequirementCategory,
  type PhdEntryBasisValue,
} from "@/lib/management/curriculum-requirements";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  curriculum_requirements_program_id_fkey: "Selected program could not be found.",
  curriculum_requirements_specialization_id_fkey: "Selected specialization could not be found.",
  curriculum_requirements_course_id_fkey: "Selected course could not be found.",
  curriculum_requirements_requirement_category_check: "Please choose a valid requirement category.",
  curriculum_requirements_applicable_entry_basis_check: "Please choose a valid PhD entry basis.",
  curriculum_requirements_course_or_category_ch: "A requirement is either a specific course or a category credit target, not both.",
};

export interface CurriculumRequirementFormState {
  error?: string;
}

function parseCurriculumRequirementInput(
  formData: FormData
): CurriculumRequirementInput | { error: string } {
  const programId = String(formData.get("program_id") ?? "").trim();
  if (!UUID_RE.test(programId)) return { error: "Please select a program." };

  const rawSpecializationId = String(formData.get("specialization_id") ?? "").trim();
  const specializationId = rawSpecializationId ? rawSpecializationId : null;
  if (specializationId && !UUID_RE.test(specializationId)) return { error: "Invalid specialization." };

  const rawCategory = String(formData.get("requirement_category") ?? "").trim();
  if (!(REQUIREMENT_CATEGORIES as readonly string[]).includes(rawCategory)) {
    return { error: "Please choose a requirement category." };
  }
  const requirementCategory = rawCategory as RequirementCategory;

  const mode = String(formData.get("requirement_mode") ?? "").trim();
  if (mode !== "course" && mode !== "category") {
    return { error: "Please choose whether this is a specific course or a category credit target." };
  }

  let courseId: string | null = null;
  let requiredCreditHours: number | null = null;

  if (mode === "course") {
    const rawCourseId = String(formData.get("course_id") ?? "").trim();
    if (!UUID_RE.test(rawCourseId)) return { error: "Please select a course." };
    courseId = rawCourseId;
  } else {
    const rawCreditHours = String(formData.get("required_credit_hours") ?? "").trim();
    const creditHours = Number(rawCreditHours);
    if (!rawCreditHours || !Number.isFinite(creditHours) || creditHours <= 0) {
      return { error: "Please enter the required credit hours (a positive number)." };
    }
    requiredCreditHours = Math.round(creditHours * 10) / 10;
  }

  const rawSemester = String(formData.get("recommended_semester") ?? "").trim();
  let recommendedSemester: number | null = null;
  if (rawSemester) {
    const semester = Number.parseInt(rawSemester, 10);
    if (!Number.isFinite(semester) || semester <= 0) {
      return { error: "Recommended semester must be a positive whole number." };
    }
    recommendedSemester = semester;
  }

  const rawEntryBasis = String(formData.get("applicable_entry_basis") ?? "").trim();
  const applicableEntryBasis = (PHD_ENTRY_BASIS_VALUES as readonly string[]).includes(rawEntryBasis)
    ? (rawEntryBasis as PhdEntryBasisValue)
    : null;

  return {
    program_id: programId,
    specialization_id: specializationId,
    course_id: courseId,
    requirement_category: requirementCategory,
    required_credit_hours: requiredCreditHours,
    recommended_semester: recommendedSemester,
    is_mandatory: formData.get("is_mandatory") === "on",
    applicable_entry_basis: applicableEntryBasis,
  };
}

export async function createCurriculumRequirementAction(
  _prevState: CurriculumRequirementFormState | undefined,
  formData: FormData
): Promise<CurriculumRequirementFormState> {
  await requireRole("management");

  const parsed = parseCurriculumRequirementInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createCurriculumRequirement(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/curriculum-requirements");
  redirect("/management/curriculum-requirements");
}

export async function updateCurriculumRequirementAction(
  id: string,
  _prevState: CurriculumRequirementFormState | undefined,
  formData: FormData
): Promise<CurriculumRequirementFormState> {
  await requireRole("management");
  if (!UUID_RE.test(id)) return { error: "Invalid requirement." };

  const parsed = parseCurriculumRequirementInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateCurriculumRequirement(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/curriculum-requirements");
  redirect("/management/curriculum-requirements");
}

export async function deleteCurriculumRequirementAction(id: string) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;

  await deleteCurriculumRequirement(id);
  revalidatePath("/management/curriculum-requirements");
}
