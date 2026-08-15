import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getSupervisorAssignmentFormOptions } from "@/lib/management/supervisor-assignments";
import { SupervisorAssignmentForm } from "../_components/supervisor-assignment-form";
import { createSupervisorAssignmentAction } from "../actions";

export default async function NewSupervisorAssignmentPage() {
  await requireRole("management");

  const { students, faculty } = await getSupervisorAssignmentFormOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/supervisor-assignments"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Supervisor Assignments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Assign Supervisor
        </h1>
      </div>
      <SupervisorAssignmentForm
        action={createSupervisorAssignmentAction}
        students={students}
        faculty={faculty}
      />
    </div>
  );
}
