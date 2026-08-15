"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  createSpecialization,
  updateSpecialization,
  setSpecializationActive,
} from "@/lib/management/specializations";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

const CONSTRAINT_MESSAGES: Record<string, string> = {
  specializations_code_key: "A specialization with this code already exists.",
  specializations_department_id_name_key: "A specialization with this name already exists in this department.",
  specializations_department_id_fkey: "Selected department could not be found.",
};

export interface SpecializationFormState {
  error?: string;
}

interface ParsedSpecializationInput {
  department_id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
}

function parseSpecializationInput(formData: FormData): ParsedSpecializationInput | { error: string } {
  const departmentId = String(formData.get("department_id") ?? "").trim();
  const rawCode = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawDescription = String(formData.get("description") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!UUID_RE.test(departmentId)) return { error: "Please select a department." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };
  if (rawCode.length > 50) return { error: "Code must be 50 characters or fewer." };
  if (rawDescription.length > 2000) return { error: "Description must be 2000 characters or fewer." };

  return {
    department_id: departmentId,
    code: rawCode || null,
    name,
    description: rawDescription || null,
    is_active: isActive,
  };
}

export async function createSpecializationAction(
  _prevState: SpecializationFormState | undefined,
  formData: FormData
): Promise<SpecializationFormState> {
  await requireRole("management");

  const parsed = parseSpecializationInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createSpecialization(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/specializations");
  redirect("/management/specializations");
}

export async function updateSpecializationAction(
  id: string,
  _prevState: SpecializationFormState | undefined,
  formData: FormData
): Promise<SpecializationFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid specialization." };

  const parsed = parseSpecializationInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateSpecialization(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/specializations");
  redirect("/management/specializations");
}

export async function toggleSpecializationActiveAction(id: string, nextActive: boolean) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;

  await setSpecializationActive(id, nextActive);
  revalidatePath("/management/specializations");
}
