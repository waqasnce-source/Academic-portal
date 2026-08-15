import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Maps a raw Postgres/PostgREST error to a safe, specific, user-facing
 * message. Verified empirically against this project's live database
 * before writing this (see the CRUD implementation report): PostgREST
 * passes the raw Postgres SQLSTATE straight through as `error.code`
 * (23505 unique_violation, 23514 check_violation, 23503
 * foreign_key_violation — not a PGRST-prefixed code), and `error.message`
 * always names the violated constraint verbatim, e.g. `violates unique
 * constraint "departments_code_key"`.
 *
 * `constraintMessages` maps known constraint names (specific to the
 * calling module) to a friendly message. Postgres names constraints
 * deterministically from table+column (`{table}_{column}_key` for a
 * unique column, `{table}_{column}_check` for an inline CHECK,
 * `{table}_{column}_fkey` for a foreign key, or `{table}_check` for a
 * table-level CHECK with no single column, e.g. semesters' `end_date >
 * start_date`), so every constraint name used by callers is either
 * confirmed against a live error or inferred from that same, well-known
 * Postgres naming algorithm applied to the exact DDL in the migrations —
 * never guessed.
 *
 * Anything unrecognized falls back to a generic message per SQLSTATE
 * class rather than ever surfacing raw Postgres text to the browser.
 */
export function toUserMessage(
  error: PostgrestError,
  constraintMessages: Record<string, string>
): string {
  const match = error.message.match(/constraint "([^"]+)"/);
  const constraintName = match?.[1];

  if (constraintName && constraintMessages[constraintName]) {
    return constraintMessages[constraintName];
  }

  console.error("Unmapped mutation error:", error);

  switch (error.code) {
    case "23505":
      return "A record with this value already exists.";
    case "23514":
      return "One of the values provided is not valid.";
    case "23503":
      return "The selected related record could not be found.";
    case "23P01":
      return "This range overlaps with an existing active record.";
    default:
      return "Could not save changes. Please try again.";
  }
}
