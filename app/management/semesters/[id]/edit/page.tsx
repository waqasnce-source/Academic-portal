import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getSemesterById } from "@/lib/management/semesters";
import { UUID_RE } from "@/lib/management/query-params";
import { SemesterForm } from "../../_components/semester-form";
import { updateSemesterAction } from "../../actions";

export default async function EditSemesterPage(
  props: PageProps<"/management/semesters/[id]/edit">
) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const semester = await getSemesterById(id);
  if (!semester) notFound();

  const action = updateSemesterAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/semesters"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Semesters
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Edit Semester
        </h1>
      </div>
      <SemesterForm action={action} defaultValues={semester} submitLabel="Save changes" />
    </div>
  );
}
