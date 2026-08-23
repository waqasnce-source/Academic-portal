"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shared sidebar nav-link for the management/faculty/student layouts —
 * highlights the active route (navy fill + gold left accent) against the
 * brand-navy sidebar background. `exact` is required for a section's own
 * root link (e.g. "Overview" at /management) so it doesn't also light up
 * for every sub-route under it.
 */
export function NavLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`relative block shrink-0 rounded-md py-2 pl-3.5 pr-3 text-sm font-medium transition-colors ${
        isActive
          ? "bg-brand-800/80 text-white before:absolute before:top-1 before:bottom-1 before:left-0 before:w-0.5 before:rounded-full before:bg-gold-400"
          : "text-brand-100/75 hover:bg-brand-800/40 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
