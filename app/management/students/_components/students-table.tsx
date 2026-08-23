import Link from "next/link";
import type { StudentRow, StudentStatus } from "@/lib/management/students";
import { toggleStudentStatusAction } from "../actions";

const STATUS_BADGE_CLASSES: Record<StudentStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  graduated: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  inactive: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  suspended:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  withdrawn: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  );
}

const NEXT_STATUS: Record<StudentStatus, StudentStatus> = {
  active: "inactive",
  inactive: "active",
  graduated: "graduated",
  suspended: "active",
  withdrawn: "active",
};

export function StudentsTable({
  students,
  hasActiveFilters,
}: {
  students: StudentRow[];
  hasActiveFilters: boolean;
}) {
  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center dark:border-slate-700">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No students found
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {hasActiveFilters
            ? "No student records match the current filters."
            : "No student records exist yet."}
        </p>
        {hasActiveFilters && (
          <Link
            href="/management/students"
            className="mt-4 inline-block text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
          >
            Clear filters
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Student #
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Name
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Email
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Program
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Department
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Admitted
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Account
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">
              Status
            </th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {students.map((student) => (
            <tr key={student.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {student.student_number}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {student.profile?.full_name ?? student.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {student.profile?.email ?? student.email ?? "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {student.program.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {student.program.department.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {student.admission_year}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                {student.profile ? "Linked" : "Not linked"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge status={student.status} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/management/students/${student.id}`}
                    className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                  >
                    Profile
                  </Link>
                  <Link
                    href={`/management/students/${student.id}/edit`}
                    className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                  >
                    Edit
                  </Link>
                  {student.status !== "graduated" && (
                    <form action={toggleStudentStatusAction.bind(null, student.id, NEXT_STATUS[student.status])}>
                      <button
                        type="submit"
                        className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                      >
                        {student.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
