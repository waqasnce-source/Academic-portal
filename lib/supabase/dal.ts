import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "student" | "faculty" | "management";

export interface CurrentProfile {
  id: string;
  role: Role;
  full_name: string;
  email: string;
  status: "active" | "inactive" | "suspended";
}

/**
 * Verifies the session against Supabase Auth (not just the cookie), so this
 * is the "secure" check per Next.js's authentication guide, safe to use
 * ahead of any data access. Wrapped in React's cache() so repeated calls in
 * one render pass only hit Supabase Auth once.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
});

/**
 * Resolves the caller's role from profiles (never from client state).
 * Returns null if the auth user has no matching profile row yet — this is
 * a valid state under the current RLS design, since only a management user
 * can insert a profiles row, so a freshly created auth user may not have
 * one until an admin finishes provisioning them.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, status")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as CurrentProfile;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Full server-side gate: authenticated, has a profile, and that profile is
 * active. Redirects to a dedicated page for each failure mode rather than
 * silently bouncing to /login, so the user understands why they're blocked.
 */
export async function requireProfile(): Promise<CurrentProfile> {
  await requireAuth();

  const profile = await getCurrentProfile();
  if (!profile) redirect("/account-pending");
  if (profile.status !== "active") redirect("/account-suspended");

  return profile;
}

export async function requireRole(role: Role): Promise<CurrentProfile> {
  const profile = await requireProfile();
  if (profile.role !== role) redirect("/dashboard");
  return profile;
}
