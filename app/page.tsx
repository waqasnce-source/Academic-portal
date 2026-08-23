import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/dal";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-50">
        Academic Portal
      </h1>
      <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
        Sign in to access your dashboard.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-full bg-brand-800 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        Sign in
      </Link>
    </div>
  );
}
