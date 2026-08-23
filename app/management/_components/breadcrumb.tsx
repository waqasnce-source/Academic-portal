import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Shared breadcrumb trail for the academic-session/semester/course/student
 * drill-down hierarchy. The last item is never linked (it's the current
 * page). Server-renderable, no client state.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-slate-900 hover:underline dark:hover:text-slate-50">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-slate-900 dark:text-slate-50" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
