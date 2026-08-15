import { requireAuth } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";

/**
 * Reached when the caller's profile exists but status is not 'active'
 * (inactive/suspended). Session is still valid, so we sign them out
 * explicitly rather than relying on them to notice.
 */
export default async function AccountSuspendedPage() {
  await requireAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Account inactive
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Your account is currently inactive or suspended. Contact an
        administrator if you believe this is a mistake.
      </p>
      <form action={logout} className="mt-6">
        <button className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          Sign out
        </button>
      </form>
    </div>
  );
}
