import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import {
  getFacultyOfferingDetail,
  getOfferingRoster,
  getOfferingSessions,
} from "@/lib/academic/faculty-courses";
import { UUID_RE } from "@/lib/management/query-params";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { SessionCreateForm } from "../_components/session-create-form";
import { GradesRosterForm } from "../_components/grades-roster-form";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultyCourseOfferingPage(props: PageProps<"/faculty/courses/[offeringId]">) {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) notFound();

  const { offeringId } = await props.params;
  if (!UUID_RE.test(offeringId)) notFound();

  const offering = await getFacultyOfferingDetail(facultyId, offeringId);
  if (!offering) notFound();

  const [roster, sessions] = await Promise.all([getOfferingRoster(offeringId), getOfferingSessions(offeringId)]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/faculty/courses" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← My Courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {offering.course.code} — {offering.course.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {offering.semester.academic_year} — {offering.semester.name} · Section {offering.section} ·{" "}
          {offering.course.credit_hours} CH
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No students enrolled in this offering yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Student</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Enrollment</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-zinc-500 dark:text-zinc-400">Attendance</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-zinc-500 dark:text-zinc-400">Grade Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {roster.map((r) => (
                  <tr key={r.enrollmentId}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <div className="font-medium text-zinc-900 dark:text-zinc-50">{r.student.name}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{r.student.studentNumber}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                      {r.student.email ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <StatusBadge label={r.enrollmentStatus} tone={r.enrollmentStatus === "active" ? "success" : "neutral"} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-zinc-500 dark:text-zinc-400">
                      {r.attendanceTotal > 0 ? `${r.attendancePresent} / ${r.attendanceTotal}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {r.result ? (
                        <StatusBadge label={r.result.published_at ? "Published" : "Draft"} tone={r.result.published_at ? "success" : "neutral"} />
                      ) : (
                        <span className="text-xs text-zinc-400 dark:text-zinc-600">Not graded</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sessions &amp; Attendance ({sessions.length})</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No sessions scheduled yet.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-700 dark:text-zinc-300">
                  {formatDate(s.class_date)} · {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {s.session_type}
                  {s.room ? ` · ${s.room}` : ""}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {s.attendanceRecordedCount > 0 ? `${s.attendanceRecordedCount} recorded` : "No attendance yet"}
                  </span>
                  <Link
                    href={`/faculty/courses/${offeringId}/sessions/${s.id}`}
                    className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    {s.attendanceRecordedCount > 0 ? "Edit Attendance" : "Take Attendance"}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
        <SessionCreateForm offeringId={offeringId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Grades</h2>
        <GradesRosterForm offeringId={offeringId} roster={roster} />
      </section>
    </div>
  );
}
