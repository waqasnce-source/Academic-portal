import type { SupervisorAssignmentRow } from "@/lib/management/supervisor-assignments";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { EmptyState } from "@/app/management/_components/empty-state";
import { endSupervisorAssignmentAction } from "../actions";

const ROLE_LABELS: Record<SupervisorAssignmentRow["role"], string> = {
  supervisor: "Supervisor",
  co_supervisor: "Co-Supervisor",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function SupervisorAssignmentsTable({
  assignments,
  hasActiveFilters,
}: {
  assignments: SupervisorAssignmentRow[];
  hasActiveFilters: boolean;
}) {
  if (assignments.length === 0) {
    return (
      <EmptyState
        entityLabelPlural="supervisor assignments"
        hasActiveFilters={hasActiveFilters}
        clearHref="/management/supervisor-assignments"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-900">
          <tr>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Student</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Faculty</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Role</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Assigned</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Ended</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">Status</th>
            <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {assignments.map((a) => (
            <tr key={a.id}>
              <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900 dark:text-slate-50">
                {a.student.profile?.full_name ?? a.student.student_number}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-slate-300">
                {a.faculty.name}
                <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">({a.faculty.designation})</span>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{ROLE_LABELS[a.role]}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{formatDate(a.assigned_date)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">{formatDate(a.end_date)}</td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge label={a.status} tone={a.status === "active" ? "success" : "neutral"} />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                {a.status === "active" ? (
                  <form action={endSupervisorAssignmentAction.bind(null, a.id)}>
                    <button
                      type="submit"
                      className="text-sm text-slate-600 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                    >
                      End Assignment
                    </button>
                  </form>
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
