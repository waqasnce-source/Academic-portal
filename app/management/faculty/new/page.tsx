import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getFacultyFilterOptions } from "@/lib/management/faculty";
import { FacultyForm } from "../_components/faculty-form";
import { createFacultyAction } from "../actions";

export default async function NewFacultyPage() {
  await requireRole("management");

  const { departments } = await getFacultyFilterOptions();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/faculty" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Faculty
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Add Faculty</h1>
      </div>
      <FacultyForm action={createFacultyAction} departments={departments} submitLabel="Create" />
    </div>
  );
}
