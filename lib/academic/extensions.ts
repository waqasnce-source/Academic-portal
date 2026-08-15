import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Mirrors extension_applications.status's CHECK constraint exactly. */
export const EXTENSION_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
] as const;
export type ExtensionApplicationStatus = (typeof EXTENSION_APPLICATION_STATUSES)[number];

export interface ExtensionApplicationRow {
  id: string;
  application_date: string;
  current_semester: number | null;
  requested_extension_semesters: number | null;
  requested_from: string | null;
  requested_to: string | null;
  reason: string | null;
  status: ExtensionApplicationStatus;
  recommendation: string | null;
  approval_date: string | null;
  remarks: string | null;
}

const EXTENSION_APPLICATION_SELECT = `
  id,
  application_date,
  current_semester,
  requested_extension_semesters,
  requested_from,
  requested_to,
  reason,
  status,
  recommendation,
  approval_date,
  remarks
`;

/** Full extension history for a student, newest application first. */
export async function getExtensionApplicationsForStudent(
  studentId: string
): Promise<ExtensionApplicationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("extension_applications")
    .select(EXTENSION_APPLICATION_SELECT)
    .eq("student_id", studentId)
    .order("application_date", { ascending: false });

  if (error) {
    console.error("getExtensionApplicationsForStudent failed:", error);
    return [];
  }
  return (data ?? []) as ExtensionApplicationRow[];
}

/**
 * The approved extension currently covering "today", if any — an
 * approved application whose requested_from/requested_to window includes
 * the current date, or an approved application with no dates set (an
 * indefinite/administrative extension). Used by status-engine.ts to
 * suppress overdue flags per the explicit instruction that the engine
 * must consider approved extensions.
 */
export function findActiveExtension(
  extensions: ExtensionApplicationRow[],
  today: Date = new Date()
): ExtensionApplicationRow | null {
  const todayStr = today.toISOString().slice(0, 10);

  return (
    extensions.find((ext) => {
      if (ext.status !== "approved") return false;
      if (!ext.requested_from && !ext.requested_to) return true;
      const afterStart = !ext.requested_from || ext.requested_from <= todayStr;
      const beforeEnd = !ext.requested_to || ext.requested_to >= todayStr;
      return afterStart && beforeEnd;
    }) ?? null
  );
}
