import { requireAuth } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";

/**
 * Reached when an authenticated Supabase Auth user has no matching
 * profiles row yet. Valid under the current RLS design: only a management
 * user can insert a profiles row, so account provisioning can lag behind
 * auth-user creation.
 */
export default async function AccountPendingPage() {
  await requireAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Account pending setup
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Your account has been created but is not yet linked to a profile.
        Contact an administrator to finish setting up your access.
      </p>
      <form action={logout} className="mt-6">
        <button className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          Sign out
        </button>
      </form>
    </div>
  );
}
