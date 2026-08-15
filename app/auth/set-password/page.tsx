import { requireAuth } from "@/lib/supabase/dal";
import { SetPasswordForm } from "./_components/set-password-form";

export default async function SetPasswordPage() {
  await requireAuth();

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <SetPasswordForm />
    </div>
  );
}
