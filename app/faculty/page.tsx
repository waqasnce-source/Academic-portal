import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getCurrentFacultyId } from "@/lib/academic/identity";
import { getSuperviseesWithStatus } from "@/lib/academic/supervisors";
import { getFacultyOfferings } from "@/lib/academic/faculty-courses";
import { getRecentNotificationsForProfile } from "@/lib/management/notifications";
import { StudentStatusBadge } from "@/app/_components/academic-status";
import { NotificationsWidget } from "@/app/_components/notifications-widget";
import { EmptyState } from "@/app/management/_components/empty-state";
import type { StudentStatusLabel } from "@/lib/academic/status-engine";

export default async function FacultyPage() {
  const profile = await requireRole("faculty");
  const facultyId = await getCurrentFacultyId(profile.id);
  const recentNotifications = await getRecentNotificationsForProfile(profile.id, 5);

  if (!facultyId) {
    return (
      <div className="space-y-8">
        <NotificationsWidget notifications={recentNotifications} revalidatePath="/faculty" />
        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No faculty record found</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your account has a faculty profile, but no faculty record has been linked yet. Contact Management.
          </p>
        </div>
      </div>
    );
  }

  const [supervisees, offerings] = await Promise.all([
    getSuperviseesWithStatus(facultyId),
    getFacultyOfferings(facultyId),
  ]);
  const totalEnrolled = offerings.reduce((sum, o) => sum + o.enrollmentCount, 0);

  const byLabel = supervisees.reduce<Record<StudentStatusLabel, number>>(
    (acc, s) => {
      if (s.academicStatus) acc[s.academicStatus.statusLabel]++;
      return acc;
    },
    { ON_TRACK: 0, DUE_SOON: 0, DELAYED: 0, EXTENDED: 0, COMPLETED: 0, ON_HOLD: 0 }
  );
  const requiringAction = supervisees.filter((s) => s.academicStatus?.requiresAdministrativeAction).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Welcome, {profile.full_name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Faculty dashboard</p>
      </div>

      <NotificationsWidget notifications={recentNotifications} revalidatePath="/faculty" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Supervisees" value={supervisees.length} />
        <Tile label="Delayed" value={byLabel.DELAYED} />
        <Tile label="Due soon" value={byLabel.DUE_SOON} />
        <Tile label="Need action" value={requiringAction} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">My Courses</h2>
          <Link
            href="/faculty/courses"
            className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            View all
          </Link>
        </div>

        {offerings.length === 0 ? (
          <EmptyState entityLabelPlural="course offerings" hasActiveFilters={false} clearHref="/faculty/courses" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Tile label="Offerings" value={offerings.length} />
              <Tile label="Students Taught" value={totalEnrolled} />
              <Tile label="Grades Published" value={offerings.reduce((sum, o) => sum + o.resultsPublishedCount, 0)} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Semester</th>
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {offerings.slice(0, 5).map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                        <Link href={`/faculty/courses/${o.id}`} className="hover:underline">
                          {o.course.code} — {o.course.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {o.semester.academic_year} — {o.semester.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right text-slate-500 dark:text-slate-400">
                        {o.enrollmentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Supervisees</h2>
          <Link
            href="/faculty/students"
            className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            View all
          </Link>
        </div>

        {supervisees.length === 0 ? (
          <EmptyState entityLabelPlural="supervisees" hasActiveFilters={false} clearHref="/faculty" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Program</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Current Stage</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Next Action</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {supervisees.slice(0, 10).map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                      <Link href={`/faculty/students/${s.student.id}`} className="hover:underline">
                        {s.student.profile?.full_name ?? s.student.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {s.student.program?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                      {s.academicStatus?.currentStage ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {s.academicStatus?.nextMilestone?.title ?? s.academicStatus?.currentMilestone?.title ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {s.academicStatus ? <StudentStatusBadge statusLabel={s.academicStatus.statusLabel} /> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
