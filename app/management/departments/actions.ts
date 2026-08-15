"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  DEPARTMENT_STATUSES,
  createDepartment,
  updateDepartment,
  setDepartmentStatus,
  type DepartmentStatus,
} from "@/lib/management/departments";
import { toUserMessage } from "@/lib/management/mutation-errors";
import { UUID_RE } from "@/lib/management/query-params";

/** Constraint names confirmed/inferred as documented in lib/management/mutation-errors.ts. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  departments_code_key: "A department with this code already exists.",
  departments_name_key: "A department with this name already exists.",
  departments_status_check: "Status must be Active or Inactive.",
};

export interface DepartmentFormState {
  error?: string;
}

function parseDepartmentInput(
  formData: FormData
): { code: string; name: string; status: DepartmentStatus } | { error: string } {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!code) return { error: "Code is required." };
  if (code.length > 50) return { error: "Code must be 50 characters or fewer." };
  if (!name) return { error: "Name is required." };
  if (name.length > 200) return { error: "Name must be 200 characters or fewer." };
  if (!(DEPARTMENT_STATUSES as readonly string[]).includes(rawStatus)) {
    return { error: "Status must be Active or Inactive." };
  }

  return { code, name, status: rawStatus as DepartmentStatus };
}

/**
 * `requireRole("management")` is called first in every action below —
 * defense-in-depth close to the mutation, matching the pattern already
 * established in app/management/settings/actions.ts. RLS
 * (`departments_insert_management` / `departments_update_management`) is
 * still the actual enforcement underneath.
 */
export async function createDepartmentAction(
  _prevState: DepartmentFormState | undefined,
  formData: FormData
): Promise<DepartmentFormState> {
  await requireRole("management");

  const parsed = parseDepartmentInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await createDepartment(parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/departments");
  redirect("/management/departments");
}

export async function updateDepartmentAction(
  id: string,
  _prevState: DepartmentFormState | undefined,
  formData: FormData
): Promise<DepartmentFormState> {
  await requireRole("management");

  if (!UUID_RE.test(id)) return { error: "Invalid department." };

  const parsed = parseDepartmentInput(formData);
  if ("error" in parsed) return { error: parsed.error };

  const { error } = await updateDepartment(id, parsed);
  if (error) return { error: toUserMessage(error, CONSTRAINT_MESSAGES) };

  revalidatePath("/management/departments");
  redirect("/management/departments");
}

export async function toggleDepartmentStatusAction(id: string, nextStatus: DepartmentStatus) {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  if (!(DEPARTMENT_STATUSES as readonly string[]).includes(nextStatus)) return;

  await setDepartmentStatus(id, nextStatus);
  revalidatePath("/management/departments");
}
