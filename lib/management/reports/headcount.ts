import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Mirrors profiles.role's CHECK constraint exactly (same as lib/management/users.ts). */
const ROLES = ["student", "faculty", "management"] as const;
/** Mirrors profiles.status's CHECK constraint exactly. */
const STATUSES = ["active", "inactive", "suspended"] as const;

export interface HeadcountSummary {
  total: number;
  byRole: { role: (typeof ROLES)[number]; count: number }[];
  byStatus: { status: (typeof STATUSES)[number]; count: number }[];
  error: string | null;
}

async function countByColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  column: "role" | "status",
  value: string
): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw error;
  return count ?? 0;
}

/**
 * As specified in the schema analysis report: "Institution Headcount
 * Summary — tables: profiles, students, faculty, departments — Metrics:
 * totals by role/status." No joins/filters were listed, so this reads
 * only `profiles` (role and status already live there — students/faculty/
 * departments aren't needed to compute a role/status cross-tab).
 *
 * Reads through the normal server-side client (publishable key), so
 * `profiles_select_authenticated` (`has_role('management') OR id =
 * auth.uid()`) is the actual enforcement — a management caller sees every
 * profile.
 */
export async function getHeadcountSummary(): Promise<HeadcountSummary> {
  const supabase = await createClient();

  try {
    const [roleCounts, statusCounts] = await Promise.all([
      Promise.all(ROLES.map((role) => countByColumn(supabase, "role", role))),
      Promise.all(STATUSES.map((status) => countByColumn(supabase, "status", status))),
    ]);

    // Every profile has exactly one role (NOT NULL CHECK), so the role
    // counts already partition the whole table — no separate total query.
    const totalCount = roleCounts.reduce((sum, n) => sum + n, 0);

    return {
      total: totalCount,
      byRole: ROLES.map((role, i) => ({ role, count: roleCounts[i] })),
      byStatus: STATUSES.map((status, i) => ({ status, count: statusCounts[i] })),
      error: null,
    };
  } catch (error) {
    console.error("getHeadcountSummary query failed:", error);
    return { total: 0, byRole: [], byStatus: [], error: "Could not load headcount summary." };
  }
}
