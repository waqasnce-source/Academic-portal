import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";

const navLinkClasses =
  "shrink-0 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50";

export default async function FacultyLayout(props: LayoutProps<"/faculty">) {
  const profile = await requireRole("faculty");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="border-b border-zinc-200 md:w-64 md:shrink-0 md:border-b-0 md:border-r dark:border-zinc-800">
        <div className="px-4 py-4">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Academic Portal
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Faculty</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
          <Link href="/faculty" className={navLinkClasses}>
            Dashboard
          </Link>
          <Link href="/faculty/courses" className={navLinkClasses}>
            My Courses
          </Link>
          <Link href="/faculty/students" className={navLinkClasses}>
            My Students
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {profile.full_name}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {profile.email}
            </p>
          </div>
          <form action={logout}>
            <button className="shrink-0 text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8">{props.children}</main>
      </div>
    </div>
  );
}
