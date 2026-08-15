import Link from "next/link";
import { requireRole } from "@/lib/supabase/dal";
import { getActiveStudentOptions } from "@/lib/management/extensions";
import { getEnrollableOfferingOptions } from "@/lib/management/course-offerings";
import { EnrollmentCreateForm } from "../_components/enrollment-create-form";

export default async function NewEnrollmentPage() {
  await requireRole("management");

  const [students, offerings] = await Promise.all([getActiveStudentOptions(), getEnrollableOfferingOptions()]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/management/enrollments"
          className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Enrollments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Add Enrollment</h1>
      </div>
      <EnrollmentCreateForm students={students} offerings={offerings} />
    </div>
  );
}
