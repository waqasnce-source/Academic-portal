import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getStudentFormOptions } from "@/lib/management/students";
import { StudentForm } from "../_components/student-form";
import { createStudentAction } from "../actions";

export default async function NewStudentPage() {
  await requireRole("management");

  const { programs, specializations } = await getStudentFormOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/students" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Students
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Add Student</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Creates the academic record only — no login account is created or linked. Account provisioning is not
          available yet (see Phase 6 report).
        </p>
      </div>
      <StudentForm action={createStudentAction} programs={programs} specializations={specializations} submitLabel="Create" />
    </div>
  );
}
