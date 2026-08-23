import { requireRole } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";
import { BrandHeader } from "@/app/_components/brand-header";
import { NavLink } from "@/app/_components/nav-link";

export default async function StudentLayout(props: LayoutProps<"/student">) {
  const profile = await requireRole("student");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-brand-900 md:w-64 md:shrink-0">
        <div className="space-y-2 border-b border-white/10 px-4 py-4">
          <BrandHeader size="sm" variant="on-dark" />
          <p className="text-xs font-medium tracking-wide text-gold-300 uppercase">Student</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-3 md:flex-col md:overflow-visible">
          <NavLink href="/student" exact>
            Dashboard
          </NavLink>
          <NavLink href="/student/progress">Academic Progress</NavLink>
          <NavLink href="/student/courses">My Courses</NavLink>
          <NavLink href="/student/degree-progress">Degree Progress</NavLink>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
              {profile.full_name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {profile.email}
            </p>
          </div>
          <form action={logout}>
            <button className="shrink-0 text-sm text-slate-500 underline hover:text-brand-700 dark:hover:text-brand-300">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8">{props.children}</main>
      </div>
    </div>
  );
}
