import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getActiveStudentOptions } from "@/lib/management/extensions";
import { ExtensionCreateForm } from "../_components/extension-create-form";

export default async function NewExtensionApplicationPage() {
  await requireRole("management");

  const students = await getActiveStudentOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/extensions" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Extension Applications
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">Record Extension Application</h1>
      </div>
      <ExtensionCreateForm students={students} />
    </div>
  );
}
