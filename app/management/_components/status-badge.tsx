/**
 * Shared pill badge for the modules built from Semesters onward — the
 * five earlier modules (students/faculty/departments/programs/courses)
 * each kept a small inline `StatusBadge` tied to their own status union;
 * left untouched deliberately rather than refactored onto this.
 */
export type BadgeTone = "success" | "info" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  warning:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  danger: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
