"use client";

import { useRouter } from "next/navigation";
import { labelClasses, fieldClasses } from "@/app/management/_components/form-styles";

/**
 * A "jump to session" control, not a filter-form field — selecting a
 * value navigates straight to that session's dedicated route
 * (/management/academic-sessions/[year]) rather than submitting a query
 * string, so each session keeps its own bookmarkable/shareable URL.
 */
export function SessionSelector({
  years,
  currentYear,
  selectedYear,
}: {
  years: string[];
  currentYear: string | null;
  selectedYear: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="academic-session-select" className={labelClasses}>
        Academic Session
      </label>
      <select
        id="academic-session-select"
        className={`${fieldClasses} min-w-[160px]`}
        value={selectedYear}
        onChange={(e) => router.push(`/management/academic-sessions/${encodeURIComponent(e.target.value)}`)}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
            {year === currentYear ? " (Current)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
