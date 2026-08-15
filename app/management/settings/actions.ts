"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/dal";
import { createClient } from "@/lib/supabase/server";
import { validateAttendancePercentage, isValidIanaTimezone } from "@/lib/management/settings";

export interface UpdateSettingsState {
  error?: string;
  success?: boolean;
}

/**
 * `requireRole("management")` here is defense-in-depth, close to the
 * mutation, matching the Next.js authentication guide's guidance to
 * verify authorization in every Server Action rather than rely solely on
 * proxy/UI gating. `system_settings_update_management` RLS is still the
 * actual enforcement underneath — this check just gives a clean error
 * message instead of a silent "0 rows updated" if it were ever bypassed.
 */
export async function updateSystemSettings(
  _prevState: UpdateSettingsState | undefined,
  formData: FormData
): Promise<UpdateSettingsState> {
  const profile = await requireRole("management");

  const rawPercentage = String(formData.get("minimum_attendance_percentage") ?? "");
  const rawTimezone = String(formData.get("institution_timezone") ?? "").trim();

  const percentage = validateAttendancePercentage(rawPercentage);
  if (percentage === null) {
    return { error: "Minimum attendance percentage must be a number between 0 and 100." };
  }

  if (!isValidIanaTimezone(rawTimezone)) {
    return { error: "Institution timezone must be a valid IANA timezone identifier (e.g. Asia/Karachi)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .update({
      minimum_attendance_percentage: percentage,
      institution_timezone: rawTimezone,
      updated_by: profile.id,
    })
    .eq("id", true);

  if (error) {
    console.error("updateSystemSettings failed:", error);
    return { error: "Could not save settings." };
  }

  revalidatePath("/management/settings");
  return { success: true };
}
