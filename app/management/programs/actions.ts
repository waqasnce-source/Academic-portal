"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  PROGRAM_STATUSES,
  DEGREE_LEVELS,
  createProgram,
  updateProgram,
  setProgramStatus,
  type ProgramStatus,
  type DegreeLevel,
} from "@/lib/management/programs";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

/** Constraint names confirmed/inferred as documented in lib/management/mutation-errors.ts. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  programs_code_key: "A program with this code already exists.",
  programs_department_id_fkey: "Selected department could not be found.",
  programs_degree_level_check: "Degree level must be Diploma, Bachelor, Master, or PhD.",
  programs_duration_years_check: "Duration must be greater than 0 years.",
  programs_status_check: "Status must be Active or Inactive.",
};

export interface ProgramFormState {
  error?: string;
}

interface ParsedProgramInput {
  department_id: string;
  code: string;
  name: string;
  degree_level: DegreeLevel;
  duration_years: number;
  status: ProgramStatus;
}

function parseProgramInput(formData: FormData): ParsedProgramInput | { error: string } {
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawDegreeLevel = String(formData.get("degree_level") ?? "").trim();
  const rawDuration = String(formData.get("duration_years") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!UUID_RE.test(departmentId)) return { error: "Please select a department." };
  if (!code) return { error: "Code is required." };
  if (code.length > 50) return { error: "Code must be 50 characters or fewer." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };
  if (!(DEGREE_LEVELS as readonly string[]).includes(rawDegreeLevel)) {
    return { error: "Degree level must be Diploma, Bachelor, Master, or PhD." };
  }

  const duration = Number(rawDuration);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { error: "Duration must be a number greater than 0." };
  }

  if (!(PROGRAM_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Status must be Active or Inactive." };
  }

  return {
    department_id: departmentId,
    code,
    name,
    degree_level: rawDegreeLevel as DegreeLevel,
    duration_years: Math.round(duration * 10) / 10,
    status: rawStatus as ProgramStatus,
  };
}

export async function createProgramAction(
  _prevState: ProgramFormState | undefined,
  formData: FormData
): Promise<ProgramFormState> {
  await requireRole("management");

  const parsed = parseProgramInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createProgram(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/programs");
  redirect("/management/programs");
}

export async function updateProgramAction(
  id: string,
  _prevState: ProgramFormState | undefined,
  formData: FormData
): Promise<ProgramFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid program." };

  const parsed = parseProgramInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateProgram(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/programs");
  redirect("/management/programs");
}

export async function toggleProgramStatusAction(id: string, nextStatus: ProgramStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  if (!(PROGRAM_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setProgramStatus(id, nextStatus);
  revalidatePath("/management/programs");
}
