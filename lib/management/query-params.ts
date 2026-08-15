import "server-only";

/**
 * Shared query-string parsing helpers, factored out once six modules
 * (students/faculty/departments/programs/courses/semesters) had each
 * hand-rolled the same firstValue/UUID_RE/page-parsing logic. Those five
 * modules keep their own inline copies deliberately — this file is for
 * every module built from here on, not a retrofit.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function firstValue(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export function parsePage(v: string | string[] | undefined): number {
  const raw = Number.parseInt(firstValue(v), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function parseEnumValue<T extends string>(
  v: string | string[] | undefined,
  allowed: readonly T[]
): T | "" {
  const raw = firstValue(v).trim();
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : "";
}

export function parseUuid(v: string | string[] | undefined): string {
  const raw = firstValue(v).trim();
  return UUID_RE.test(raw) ? raw : "";
}

export function parseText(v: string | string[] | undefined, maxLength = 200): string {
  return firstValue(v).trim().slice(0, maxLength);
}

/** Strips characters that would break a hand-built PostgREST filter/or() expression. */
export function escapeIlike(v: string): string {
  return v.replace(/[(),]/g, "");
}
