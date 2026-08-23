import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import {
  getFacultyOfferingDetail,
  getCourseSessionById,
  getSessionRoster,
} from "@/lib/academic/faculty-courses";
import { UUID_RE } from "@/lib/management/query-params";
import { AttendanceRosterForm } from "../../../_components/attendance-roster-form";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function FacultySessionAttendancePage(
  props: PageProps<"/faculty/courses/[offeringId]/sessions/[sessionId]">
) {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  if (!facultyId) notFound();

  const { offeringId, sessionId } = await props.params;
  if (!UUID_RE.test(offeringId) || !UUID_RE.test(sessionId)) notFound();

  const offering = await getFacultyOfferingDetail(facultyId, offeringId);
  if (!offering) notFound();

  const session = await getCourseSessionById(sessionId);
  if (!session || session.course_offering_id !== offeringId) notFound();

  const roster = await getSessionRoster(offeringId, sessionId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/faculty/courses/${offeringId}`}
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← {offering.course.code} — {offering.course.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Attendance — {formatDate(session.class_date)}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)} · {session.session_type}
          {session.room ? ` · ${session.room}` : ""}
        </p>
      </div>

      <AttendanceRosterForm offeringId={offeringId} sessionId={sessionId} roster={roster} />
    </div>
  );
}
