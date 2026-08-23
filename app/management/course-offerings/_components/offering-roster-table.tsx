import Link from "next/link";
import { StatusBadge } from "@/app/management/_components/status-badge";
import type { OfferingRosterRow } from "@/lib/management/course-offerings";

const DEGREE_LEVEL_LABELS: Record<string, string> = {
  diploma: "Diploma",
  bachelor: "Bachelor",
  master: "MS/M.Phil.",
  phd: "Ph.D.",
};

const ENROLLMENT_TONE: Record<string, "success" | "neutral" | "warning" | "danger"> = {
  active: "success",
  completed: "neutral",
  dropped: "warning",
  failed: "danger",
};

/** Mirrors REPORTING_ENROLLMENT_STATUSES in lib/management/reporting-policy.ts — 'dropped' is the one status excluded from official headcounts, so the roster (which intentionally still shows it) flags it explicitly rather than leaving the distinction implicit in badge color alone. */
const NOT_COUNTED_STATUSES = new Set(["dropped"]);

export function OfferingRosterTable({
  roster,
  offeringId,
  courseLabel,
}: {
  roster: OfferingRosterRow[];
  offeringId: string;
  courseLabel: string;
}) {
  if (roster.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No students enrolled in this offering yet.</p>;
  }

  const backParams = `?backHref=${encodeURIComponent(`/management/course-offerings/${offeringId}`)}&backLabel=${encodeURIComponent(courseLabel)}`;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Email</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Level</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Enrolled</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {roster.map((r) => (
            <tr key={r.enrollmentId}>
              <td className="whitespace-nowrap px-4 py-2.5">
                <Link
                  href={`/management/academic-progress/${r.student.id}${backParams}`}
                  className="font-medium text-slate-900 hover:underline dark:text-slate-50"
                >
                  {r.student.name}
                </Link>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {r.student.studentNumber} · <Link href={`/management/students/${r.student.id}`} className="hover:underline">Record</Link>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {r.student.email ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {r.student.program?.name ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {r.student.program ? (DEGREE_LEVEL_LABELS[r.student.program.degreeLevel] ?? r.student.program.degreeLevel) : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={r.enrollmentStatus} tone={ENROLLMENT_TONE[r.enrollmentStatus] ?? "neutral"} />
                {NOT_COUNTED_STATUSES.has(r.enrollmentStatus) && (
                  <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-600">Not counted in official totals</div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {new Date(r.enrolledAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
