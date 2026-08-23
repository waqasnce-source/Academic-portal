import { redirect, notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { UUID_RE } from "@/lib/management/query-params";

/**
 * This per-faculty "teaching history by session" view has been absorbed
 * into the Management faculty hub (/management/faculty/[id]), which shows
 * the same session-scoped teaching table alongside supervision — per the
 * explicit instruction not to maintain multiple faculty-detail
 * implementations for different contexts. The route itself is preserved
 * (redirects rather than 404s) so any existing links/bookmarks still
 * resolve.
 */
export default async function FacultyTeachingHistoryRedirectPage(
  props: PageProps<"/management/reports/teaching-load/[facultyId]">
) {
  await requireRole("management");

  const { facultyId } = await props.params;
  if (!UUID_RE.test(facultyId)) notFound();

  redirect(`/management/faculty/${facultyId}`);
}
