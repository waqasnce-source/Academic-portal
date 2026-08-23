import Link from "next/link";

export type SemesterTab = "courses" | "students" | "operations";

const TABS: { key: SemesterTab; label: string; hrefSuffix: string }[] = [
  { key: "courses", label: "Courses", hrefSuffix: "" },
  { key: "students", label: "Students", hrefSuffix: "/students" },
  { key: "operations", label: "Operations", hrefSuffix: "/operations" },
];

/**
 * Server-rendered tab strip shared by the three semester sub-pages
 * (courses/students/operations) — the active tab is passed as a prop by
 * each page rather than detected client-side, so no "use client"/usePathname
 * is needed here.
 */
export function SemesterTabs({ semesterId, active }: { semesterId: string; active: SemesterTab }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/management/semesters/${semesterId}${tab.hrefSuffix}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              isActive
                ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
