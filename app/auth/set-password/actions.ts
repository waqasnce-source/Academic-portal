"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/supabase/dal";

export interface SetPasswordState {
  error?: string;
}

/**
 * Completes the invite flow: the caller already has a valid session
 * (established by app/auth/confirm/route.ts's verifyOtp() call), so this
 * only needs to set a real password on it via the normal cookie-scoped
 * client — no service-role key involved. requireAuth() re-verifies the
 * session server-side rather than trusting that the page was reached
 * through the intended flow.
 */
export async function setPasswordAction(
  _prevState: SetPasswordState | undefined,
  formData: FormData
): Promise<SetPasswordState> {
  await requireAuth();

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message || "Could not set your password. Try again." };

  redirect("/dashboard");
}
