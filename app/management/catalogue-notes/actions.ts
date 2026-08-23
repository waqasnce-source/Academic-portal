"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { setCatalogueNoteStatus, reopenCatalogueNote } from "@/lib/management/catalogue-notes";
import { UUID_RE } from "@/lib/management/query-params";
import { toUserMessage } from "@/lib/management/mutation-errors";

export interface CatalogueNoteFormState {
  error?: string;
}

async function updateStatus(
  id: string,
  status: "resolved" | "dismissed",
  _prevState: CatalogueNoteFormState | undefined,
  formData: FormData
): Promise<CatalogueNoteFormState> {
  const profile = await requireRole("management");
  if (!UUID_RE.test(id)) return { error: "Invalid record." };

  const resolutionNote = String(formData.get("resolution_note") ?? "").trim();
  const { error } = await setCatalogueNoteStatus(id, status, resolutionNote, profile.id);
  if (error) return { error: toUserMessage(error, {}) };

  revalidatePath("/management/catalogue-notes");
  return {};
}

export async function resolveCatalogueNoteAction(
  id: string,
  prevState: CatalogueNoteFormState | undefined,
  formData: FormData
): Promise<CatalogueNoteFormState> {
  return updateStatus(id, "resolved", prevState, formData);
}

export async function dismissCatalogueNoteAction(
  id: string,
  prevState: CatalogueNoteFormState | undefined,
  formData: FormData
): Promise<CatalogueNoteFormState> {
  return updateStatus(id, "dismissed", prevState, formData);
}

export async function reopenCatalogueNoteAction(id: string): Promise<void> {
  await requireRole("management");
  if (!UUID_RE.test(id)) return;
  await reopenCatalogueNote(id);
  revalidatePath("/management/catalogue-notes");
}
