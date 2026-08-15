import "server-only";

import { createClient } from "@/lib/supabase/server";
import { type RawSearchParams, firstValue, parsePage, parseText, escapeIlike } from "@/lib/management/query-params";

export const NOTIFICATIONS_PAGE_SIZE = 25;

/** notifications has no status/enum column — `is_read` is a real boolean, so this is a read/unread toggle, not an invented status. */
export const READ_FILTER_VALUES = ["read", "unread"] as const;
export type ReadFilterValue = (typeof READ_FILTER_VALUES)[number];

export interface NotificationRow {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  profile: { full_name: string; email: string };
}

export interface NotificationFilters {
  q: string;
  read: ReadFilterValue | "";
  page: number;
}

export interface NotificationsResult {
  data: NotificationRow[];
  count: number;
  page: number;
  error: string | null;
}

export function parseNotificationFilters(
  searchParams: RawSearchParams
): NotificationFilters {
  const raw = firstValue(searchParams.read).trim();
  const read = (READ_FILTER_VALUES as readonly string[]).includes(raw)
    ? (raw as ReadFilterValue)
    : "";

  return { q: parseText(searchParams.q), read, page: parsePage(searchParams.page) };
}

export function hasActiveNotificationFilters(filters: NotificationFilters): boolean {
  return Boolean(filters.q || filters.read);
}

export function buildNotificationsHref(
  filters: NotificationFilters,
  page: number
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.read) params.set("read", filters.read);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/notifications?${qs}` : "/management/notifications";
}

/**
 * `profile:profiles!inner(...)` is safe as an inner join here (unlike
 * notices' publisher embed): notifications.profile_id is NOT NULL with
 * ON DELETE CASCADE, so a notification row can never outlive its
 * recipient's profile — there's no orphan case `!inner` would need to
 * tolerate.
 */
const NOTIFICATION_SELECT = `
  id,
  title,
  message,
  is_read,
  read_at,
  created_at,
  profile:profiles!inner ( full_name, email )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `notifications_self_select` (`profile_id = auth.uid() OR
 * get_my_role() = 'management'`) is the actual enforcement — unlike
 * notices, this policy DOES have a management override, so a management
 * caller sees every notification regardless of recipient.
 *
 * Counts records first (head-only, no `.range()`, no embed) and clamps
 * the requested page to the real last page before issuing the ranged
 * data query — same fix applied in every prior module.
 */
export async function getNotifications(
  filters: NotificationFilters
): Promise<NotificationsResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("notifications").select("id", { count: "exact", head: true });

  if (filters.read === "read") countQuery = countQuery.eq("is_read", true);
  if (filters.read === "unread") countQuery = countQuery.eq("is_read", false);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    countQuery = countQuery.or(`title.ilike.%${escaped}%,message.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getNotifications count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load notification records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / NOTIFICATIONS_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("notifications").select(NOTIFICATION_SELECT);

  if (filters.read === "read") dataQuery = dataQuery.eq("is_read", true);
  if (filters.read === "unread") dataQuery = dataQuery.eq("is_read", false);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    dataQuery = dataQuery.or(`title.ilike.%${escaped}%,message.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * NOTIFICATIONS_PAGE_SIZE;
  const to = from + NOTIFICATIONS_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getNotifications data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load notification records." };
  }

  return {
    data: (data ?? []) as unknown as NotificationRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}

/**
 * Writes a single notification. `notifications_insert_management`
 * (`has_role('management')`) is the actual enforcement — every caller of
 * this helper is itself a management Server Action.
 */
export async function createNotification(input: {
  profileId: string;
  title: string;
  message: string;
}) {
  const supabase = await createClient();
  return supabase.from("notifications").insert({
    profile_id: input.profileId,
    title: input.title,
    message: input.message,
  });
}

/**
 * Best-effort notification for a student/faculty member who may not have
 * a linked Supabase Auth account yet. notifications.profile_id is NOT
 * NULL, so a profile-less person cannot receive one — this no-ops rather
 * than erroring, and never blocks the workflow action it's called from
 * (a failed/skipped notification is not a reason to fail the underlying
 * academic-record mutation).
 */
export async function notifyIfLinked(
  profileId: string | null,
  title: string,
  message: string
): Promise<void> {
  if (!profileId) return;
  const { error } = await createNotification({ profileId, title, message });
  if (error) {
    console.error("notifyIfLinked failed:", error);
  }
}

/**
 * Recent notifications for one profile, newest first — no pagination (a
 * small, fixed-size dashboard/portal widget query, not the full
 * filterable list `getNotifications()` already serves). Takes an explicit
 * `profileId` rather than resolving the session internally, matching the
 * convention every lib/academic/*.ts reader already follows (the caller
 * has already resolved it via `requireRole()`); RLS
 * (`notifications_self_select`) remains the actual boundary regardless of
 * what id is passed in.
 */
export async function getRecentNotificationsForProfile(profileId: string, limit = 10): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, is_read, read_at, created_at, profile:profiles!inner ( full_name, email )")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentNotificationsForProfile failed:", error);
    return [];
  }
  return (data ?? []) as unknown as NotificationRow[];
}

/**
 * Marks one notification read/unread. RLS enforcement is
 * `notifications_self_update` (`profile_id = auth.uid() OR management`) —
 * this function does not itself check ownership, same convention as every
 * other lib/management/*.ts mutation; a student attempting to mark
 * another profile's notification is filtered to zero rows by RLS, not an
 * application-level check.
 */
export async function setNotificationRead(id: string, isRead: boolean) {
  const supabase = await createClient();
  return supabase
    .from("notifications")
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq("id", id);
}
