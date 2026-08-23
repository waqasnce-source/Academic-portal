import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getActiveStudentOptions } from "@/lib/management/extensions";
import { ThesisCreateForm } from "../_components/thesis-create-form";

export default async function NewThesisRecordPage() {
  await requireRole("management");

  const students = await getActiveStudentOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/thesis" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Thesis Records
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Create Thesis Record</h1>
      </div>
      <ThesisCreateForm students={students} />
    </div>
  );
}
