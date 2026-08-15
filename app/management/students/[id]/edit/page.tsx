import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getStudentById, getStudentFormOptions } from "@/lib/management/students";
import { UUID_RE } from "@/lib/management/query-params";
import { StudentForm } from "../../_components/student-form";
import { updateStudentAction } from "../../actions";

export default async function EditStudentPage(props: PageProps<"/management/students/[id]/edit">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [student, { programs, specializations }] = await Promise.all([getStudentById(id), getStudentFormOptions()]);
  if (!student) notFound();

  const action = updateStudentAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/students" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Students
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Student</h1>
        {!student.profile_id && (
          <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            No Supabase Auth account is linked to this record yet — account linking is not built in this phase.
          </p>
        )}
      </div>
      <StudentForm action={action} programs={programs} specializations={specializations} defaultValues={student} submitLabel="Save changes" />
    </div>
  );
}
