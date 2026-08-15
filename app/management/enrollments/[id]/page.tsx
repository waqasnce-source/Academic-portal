import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getEnrollmentById } from "@/lib/management/enrollments";
import { UUID_RE } from "@/lib/management/query-params";
import { EnrollmentStatusForm } from "../_components/enrollment-status-form";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ManagementEnrollmentDetailPage(props: PageProps<"/management/enrollments/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const enrollment = await getEnrollmentById(id);
  if (!enrollment) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/enrollments" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Enrollments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {enrollment.student.profile?.full_name ?? enrollment.student.name}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{enrollment.student.student_number}</p>
      </div>

      <section className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Field label="Course" value={`${enrollment.course_offering.course.code} — ${enrollment.course_offering.course.name}`} />
        <Field
          label="Semester"
          value={`${enrollment.course_offering.semester.academic_year} — ${enrollment.course_offering.semester.name}`}
        />
        <Field label="Section" value={enrollment.course_offering.section} />
        <Field label="Offering Status" value={enrollment.course_offering.status} />
        <Field label="Enrolled" value={formatDate(enrollment.enrolled_at)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Status</h2>
        <EnrollmentStatusForm enrollmentId={enrollment.id} currentStatus={enrollment.status} />
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-50">{value}</p>
    </div>
  );
}
