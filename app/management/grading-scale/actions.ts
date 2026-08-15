"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  createGradingScaleBand,
  updateGradingScaleBand,
  setGradingScaleBandStatus,
  GRADING_SCALE_STATUSES,
  type GradingScaleInput,
  type GradingScaleStatus,
} from "@/lib/management/grading-scale";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  grading_scale_max_gt_min: "Maximum marks must be greater than minimum marks.",
  grading_scale_no_overlap_active: "This mark range overlaps with another active band. Deactivate the conflicting band first, or adjust the range.",
};

export interface GradingScaleFormState {
  error?: string;
}

function parseGradingScaleInput(formData: FormData): GradingScaleInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (name.length > 100) return { error: "Name must be 100 characters or fewer." };

  const letterGrade = String(formData.get("letter_grade") ?? "").trim();
  if (!letterGrade) return { error: "Letter grade is required." };
  if (letterGrade.length > 20) return { error: "Letter grade must be 20 characters or fewer." };

  const rawMin = String(formData.get("min_marks") ?? "").trim();
  const minMarks = Number(rawMin);
  if (!rawMin || !Number.isFinite(minMarks) || minMarks < 0) {
    return { error: "Minimum marks must be zero or a positive number." };
  }

  const rawMax = String(formData.get("max_marks") ?? "").trim();
  const maxMarks = Number(rawMax);
  if (!rawMax || !Number.isFinite(maxMarks)) {
    return { error: "Maximum marks is required." };
  }
  if (maxMarks <= minMarks) {
    return { error: "Maximum marks must be greater than minimum marks." };
  }

  const rawGradePoint = String(formData.get("grade_point") ?? "").trim();
  const gradePoint = Number(rawGradePoint);
  if (!rawGradePoint || !Number.isFinite(gradePoint) || gradePoint < 0) {
    return { error: "Grade point must be zero or a positive number." };
  }

  const rawStatus = String(formData.get("status") ?? "").trim();
  const status = (GRADING_SCALE_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as GradingScaleStatus)
    : "active";

  return {
    name,
    min_marks: Math.round(minMarks * 100) / 100,
    max_marks: Math.round(maxMarks * 100) / 100,
    letter_grade: letterGrade,
    grade_point: Math.round(gradePoint * 100) / 100,
    is_passing: formData.get("is_passing") === "on",
    status,
  };
}

export async function createGradingScaleBandAction(
  _prevState: GradingScaleFormState | undefined,
  formData: FormData
): Promise<GradingScaleFormState> {
  await requireRole("management");

  const parsed = parseGradingScaleInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createGradingScaleBand(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/grading-scale");
  redirect("/management/grading-scale");
}

export async function updateGradingScaleBandAction(
  id: string,
  _prevState: GradingScaleFormState | undefined,
  formData: FormData
): Promise<GradingScaleFormState> {
  await requireRole("management");
  if (!UUID_RE.test(id)) return { error: "Invalid grading band." };

  const parsed = parseGradingScaleInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateGradingScaleBand(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/grading-scale");
  redirect("/management/grading-scale");
}

export async function toggleGradingScaleBandStatusAction(id: string, nextStatus: GradingScaleStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;

  await setGradingScaleBandStatus(id, nextStatus);
  revalidatePath("/management/grading-scale");
}
