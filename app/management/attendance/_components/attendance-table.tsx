import { EmptyState } from "@/app/management/_components/empty-state";
import { StatusBadge, type BadgeTone } from "@/app/management/_components/status-badge";
import type { AttendanceRow, AttendanceStatus } from "@/lib/management/attendance";

const STATUS_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: "success",
  absent: "danger",
  late: "warning",
  excused: "info",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AttendanceTable({
  records,
  hasActiveFilters,
}: {
  records: AttendanceRow[];
  hasActiveFilters: boolean;
}) {
  if (records.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="attendance records"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/attendance"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Course</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Session</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Room</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Remarks</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {records.map((record) => (
            <tr key={record.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {record.enrollment.student.profile?.full_name ?? record.enrollment.student.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {record.course_session.course_offering.course.code} — {record.course_session.course_offering.course.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {formatDate(record.course_session.class_date)} {record.course_session.start_time}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {record.course_session.room ?? "—"}
              </td>
              <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {record.remarks ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={record.status} tone={STATUS_TONES[record.status]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
