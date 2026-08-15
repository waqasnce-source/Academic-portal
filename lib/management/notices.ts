import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  type RawSearchParams,
  parseEnumValue,
  parsePage,
  parseText,
  escapeIlike,
} from "@/lib/management/query-params";

/**
 * Mirrors notices.audience's CHECK constraint exactly (all four values).
 *
 * `notices_authenticated_select` previously had no `has_role('management')
 * OR ...` override (unlike every other _select_authenticated policy in
 * this schema), so a management caller could only ever see rows where
 * audience = 'all' OR audience = 'management', and never an expired
 * notice. That gap was closed in
 * supabase/migrations/20260813185442_fix_notices_management_select.sql,
 * which added the same management override every other policy already
 * had. A management caller now sees every notice regardless of audience
 * or expiry, so all four CHECK-constrained values are valid filters here.
 */
export const NOTICE_AUDIENCES = ["all", "students", "faculty", "management"] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export const NOTICES_PAGE_SIZE = 25;

export interface NoticeRow {
  id: string;
  title: string;
  content: string;
  audience: string;
  published_at: string;
  expires_at: string | null;
  created_at: string;
  publisher: { full_name: string } | null;
}

export interface NoticeFilters {
  q: string;
  audience: NoticeAudience | "";
  page: number;
}

export interface NoticesResult {
  data: NoticeRow[];
  count: number;
  page: number;
  error: string | null;
}

export function parseNoticeFilters(searchParams: RawSearchParams): NoticeFilters {
  return {
    q: parseText(searchParams.q),
    audience: parseEnumValue(searchParams.audience, NOTICE_AUDIENCES),
    page: parsePage(searchParams.page),
  };
}

export function hasActiveNoticeFilters(filters: NoticeFilters): boolean {
  return Boolean(filters.q || filters.audience);
}

export function buildNoticesHref(filters: NoticeFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.audience) params.set("audience", filters.audience);
  if (page > 1) params.set("page", String(page));

  const qs = params.toString();
  return qs ? `/management/notices?${qs}` : "/management/notices";
}

/**
 * `publisher:profiles(...)` is deliberately NOT `!inner` — published_by is
 * nullable (`ON DELETE SET NULL`), so a notice whose publisher account
 * was later removed is still a valid row that should still appear, just
 * with no publisher to show.
 */
const NOTICE_SELECT = `
  id,
  title,
  content,
  audience,
  published_at,
  expires_at,
  created_at,
  publisher:profiles ( full_name )
`;

/**
 * Reads through the normal server-side client (publishable key), so
 * `notices_authenticated_select` is the actual enforcement — since the
 * fix in 20260813185442_fix_notices_management_select.sql, a management
 * caller sees every notice regardless of audience or expiry.
 *
 * Counts records first (head-only, no `.range()`) and clamps the
 * requested page to the real last page before issuing the ranged data
 * query — same fix applied in every prior module.
 */
export async function getNotices(filters: NoticeFilters): Promise<NoticesResult> {
  const supabase = await createClient();

  let countQuery = supabase.from("notices").select("id", { count: "exact", head: true });

  if (filters.audience) countQuery = countQuery.eq("audience", filters.audience);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    countQuery = countQuery.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    console.error("getNotices count query failed:", countError);
    return { data: [], count: 0, page: filters.page, error: "Could not load notice records." };
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / NOTICES_PAGE_SIZE));
  const safePage = Math.min(Math.max(filters.page, 1), totalPages);

  let dataQuery = supabase.from("notices").select(NOTICE_SELECT);

  if (filters.audience) dataQuery = dataQuery.eq("audience", filters.audience);
  if (filters.q) {
    const escaped = escapeIlike(filters.q);
    dataQuery = dataQuery.or(`title.ilike.%${escaped}%,content.ilike.%${escaped}%`);
  }

  const from = (safePage - 1) * NOTICES_PAGE_SIZE;
  const to = from + NOTICES_PAGE_SIZE - 1;

  const { data, error } = await dataQuery
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("getNotices data query failed:", error);
    return { data: [], count: 0, page: safePage, error: "Could not load notice records." };
  }

  return {
    data: (data ?? []) as unknown as NoticeRow[],
    count: totalCount,
    page: safePage,
    error: null,
  };
}
