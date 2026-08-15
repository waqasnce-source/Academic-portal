import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/dal";

/**
 * Not a dashboard itself — routes each authenticated, active profile to
 * their role-specific area. Keeping this redirect server-side (rather than
 * a client useEffect) avoids ever flashing the wrong role's content.
 */
export default async function DashboardPage() {
  const profile = await requireProfile();
  redirect(`/${profile.role}`);
}
