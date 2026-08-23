import { requireRole } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";
import { BrandHeader } from "@/app/_components/brand-header";
import { NavLink } from "@/app/_components/nav-link";
import { GlobalSearchForm } from "./_components/global-search-form";
import { MANAGEMENT_NAV_GROUPS } from "@/lib/management/modules";

export default async function ManagementLayout(props: LayoutProps<"/management">) {
  const profile = await requireRole("management");

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-brand-900 md:w-64 md:shrink-0">
        <div className="space-y-2 border-b border-white/10 px-4 py-4">
          <BrandHeader size="sm" variant="on-dark" />
          <p className="text-xs font-medium tracking-wide text-gold-300 uppercase">Management</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-3 md:flex-col md:overflow-visible">
          <NavLink href="/management" exact>
            Overview
          </NavLink>
          {MANAGEMENT_NAV_GROUPS.map((group) => (
            <div key={group.label} className="md:mt-3">
              <p className="hidden px-3.5 pb-1 text-[10px] font-semibold tracking-wide text-brand-300/70 uppercase md:block">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavLink key={item.slug} href={`/management/${item.slug}`}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
          <GlobalSearchForm />
          <div className="flex items-center gap-4">
            <div className="min-w-0 text-right">
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
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{props.children}</main>
      </div>
    </div>
  );
}
