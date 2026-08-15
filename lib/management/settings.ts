import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface SystemSettings {
  minimumAttendancePercentage: number;
  institutionTimezone: string;
  updatedAt: string;
  updatedByName: string | null;
}

interface RawSettingsRow {
  minimum_attendance_percentage: number;
  institution_timezone: string;
  updated_at: string;
  updater: { full_name: string } | null;
}

/**
 * Reads through the normal server-side client (publishable key), so
 * `system_settings_select_authenticated` (`using (true)`) is the actual
 * enforcement — any authenticated user can read the singleton row.
 */
export async function getSystemSettings(): Promise<{
  settings: SystemSettings | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_settings")
    .select(
      "minimum_attendance_percentage, institution_timezone, updated_at, updater:profiles(full_name)"
    )
    .eq("id", true)
    .single();

  if (error || !data) {
    console.error("getSystemSettings query failed:", error);
    return { settings: null, error: "Could not load system settings." };
  }

  const row = data as unknown as RawSettingsRow;

  return {
    settings: {
      minimumAttendancePercentage: Number(row.minimum_attendance_percentage),
      institutionTimezone: row.institution_timezone,
      updatedAt: row.updated_at,
      updatedByName: row.updater?.full_name ?? null,
    },
    error: null,
  };
}

/** Mirrors the DB CHECK constraint (0-100) exactly — validated here too so the form can show a clear error instead of a raw Postgres error. */
export function validateAttendancePercentage(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value * 100) / 100;
}

/**
 * There is no DB-level constraint for this (Postgres CHECK constraints
 * can't reference the system timezone-name catalog — see the migration's
 * column comment), so this is the only validation that exists.
 * `Intl.supportedValuesOf` is a standard, Node 18+ built-in — no
 * dependency needed.
 */
export function isValidIanaTimezone(value: string): boolean {
  try {
    return Intl.supportedValuesOf("timeZone").includes(value);
  } catch {
    return false;
  }
}
