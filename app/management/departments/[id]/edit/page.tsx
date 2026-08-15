import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getDepartmentById } from "@/lib/management/departments";
import { UUID_RE } from "@/lib/management/query-params";
import { DepartmentForm } from "../../_components/department-form";
import { updateDepartmentAction } from "../../actions";

export default async function EditDepartmentPage(
  props: PageProps<"/management/departments/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const department = await getDepartmentById(id);
  if (!department) notFound();

  const action = updateDepartmentAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/departments"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Departments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Department
        </h1>
      </div>
      <DepartmentForm action={action} defaultValues={department} submitLabel="Save changes" />
    </div>
  );
}
