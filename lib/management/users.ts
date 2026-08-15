import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseEnumValue,
  parsePage,
  parseText,
  escapeIlike,
} from "@/lib/management/query-params";

/** Mirrors profiles.role's CHECK constraint exactly. */
export const PROFILE_ROLES = ["student", "faculty", "management"] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

/** Mirrors profiles.status's CHECK constraint exactly. */
export const PROFILE_STATUSES = ["active", "inactive", "suspended"] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const USERS_PAGE_SIZE = 25;

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  created_at: string;
}

export interface UserFilters {
  q: string;
  role: ProfileRole | "";
  status: ProfileStatus | "";
  page: number;
}

export interface UsersResult {
  data: UserRow[];
  count: number;
  page: number;
  error: string | null;
}

export function parseUserFilters(searchParams: RawSearchParams): UserFilters {
  return {
    q: parseText(searchParams.q),
    role: parseEnumValue(searchParams.role, PROFILE_ROLES),
    status: parseEnumValue(searchParams.status, PROFILE_STATUSES),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveUserFilters(filters: UserFilters): boolean {
  return Boolean(filters.q || filters.role || filters.status);
}

export function buildUsersHref(filters: UserFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/users?${qs}` : "/management/users";
}

/**
 * `profiles` is the root identity table — no embeds, unlike every other
 * module built so far. `phone`/`avatar_url` are the only other columns;
 * `avatar_url` is a URL meant for rendering an image, not tabular data,
 * so it's left out of this read-only listing rather than added just
 * because the column exists.
 */
const USER_SELECT = "id, full_name, email, phone, role, status, created_at";

/**
 * Reads through the normal server-side client (publishable key), so
 * `profiles_select_authenticated` (`has_role('management') OR id =
 * auth.uid()`) is the actual enforcement — a management caller sees
 * every profile, across all three roles.
 *
 * Counts records first (head-only, no `.range()`) and clamps the
 * requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getUsers(filters: UserFilters): Promise<UsersResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("profiles").select("id", { count: "exact", head: true });

  if (filters.role) countQuery = countQuery.eq("role", filters.role);
  if (filters.status) countQuery = countQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    countQuery = countQuery.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getUsers count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load user records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / USERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("profiles").select(USER_SELECT);

  if (filters.role) dataQuery = dataQuery.eq("role", filters.role);
  if (filters.status) dataQuery = dataQuery.eq("status", filters.status);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    dataQuery = dataQuery.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * USERS_PAGE_SIZE;
  const to = from + USERS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("full_name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("getUsers data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load user records." };
  }

  return {
    data: (data ?? []) as unknown as UserRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}
