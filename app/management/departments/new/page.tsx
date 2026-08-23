import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { DepartmentForm } from "../_components/department-form";
import { createDepartmentAction } from "../actions";

export default async function NewDepartmentPage() {
  await requireRole("management");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/departments"
          className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50"
        >
          ← Departments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          Add Department
        </h1>
      </div>
      <DepartmentForm action={createDepartmentAction} submitLabel="Create" />
    </div>
  );
}
