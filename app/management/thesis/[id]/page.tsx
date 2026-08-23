import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import {
  getThesisRecordById,
  getThesisReviewersForThesis,
  getThesisReviewsForThesis,
  getThesisCorrectionsForThesis,
  getVivaExaminationForStudent,
  getResultDeclarationForStudent,
} from "@/lib/management/thesis";
import { UUID_RE } from "@/lib/management/query-params";
import { MilestoneStatusBadge, formatAcademicDate } from "@/app/_components/academic-status";
import { ThesisEditForm } from "../_components/thesis-edit-form";
import { ThesisReviewerForm } from "../_components/thesis-reviewer-form";
import { ThesisReviewForm } from "../_components/thesis-review-form";
import { ThesisCorrectionForm } from "../_components/thesis-correction-form";
import { VivaForm } from "../_components/viva-form";
import { ResultDeclarationForm } from "../_components/result-declaration-form";

export default async function ManagementThesisDetailPage(props: PageProps<"/management/thesis/[id]">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const thesis = await getThesisRecordById(id);
  if (!thesis) notFound();

  const [reviewers, reviews, corrections, viva, resultDeclaration] = await Promise.all([
    getThesisReviewersForThesis(id),
    getThesisReviewsForThesis(id),
    getThesisCorrectionsForThesis(id),
    getVivaExaminationForStudent(thesis.student_id),
    getResultDeclarationForStudent(thesis.student_id),
  ]);

  const reviewsByReviewer = new Map(reviewers.map((r) => [r.id, reviews.filter((rv) => rv.reviewer_id === r.id)]));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/management/thesis" className="text-sm text-slate-500 underline hover:text-slate-900 dark:hover:text-slate-50">
          ← Thesis Records
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {thesis.student.profile?.full_name ?? thesis.student.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{thesis.thesis_title ?? "No title recorded yet"}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Thesis Record</h2>
        <ThesisEditForm
          thesisId={thesis.id}
          studentId={thesis.student_id}
          defaultValues={{
            thesis_title: thesis.thesis_title,
            submission_date: thesis.submission_date,
            status: thesis.status,
            clearance_status: thesis.clearance_status,
            remarks: thesis.remarks,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reviewers &amp; Reviews ({reviewers.length})</h2>
        {reviewers.length > 0 && (
          <ul className="space-y-3">
            {reviewers.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{r.reviewer_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.reviewer_type[0].toUpperCase() + r.reviewer_type.slice(1)}
                      {r.affiliation ? ` · ${r.affiliation}` : ""}
                      {r.country ? ` · ${r.country}` : ""}
                    </p>
                  </div>
                </div>
                {(reviewsByReviewer.get(r.id) ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {(reviewsByReviewer.get(r.id) ?? []).map((rv) => (
                      <li key={rv.id} className="rounded-md bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-900">
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatAcademicDate(rv.received_date)} — {rv.recommendation ?? "No recommendation recorded"}
                        </span>
                        {rv.comments && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rv.comments}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3">
                  <ThesisReviewForm thesisId={thesis.id} reviewerId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <ThesisReviewerForm thesisId={thesis.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Corrections ({corrections.length})</h2>
        {corrections.length > 0 && (
          <ul className="space-y-2">
            {corrections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300">
                  {formatAcademicDate(c.submitted_date)}
                  {c.remarks ? ` — ${c.remarks}` : ""}
                </span>
                {c.status && <MilestoneStatusBadge status={c.status} />}
              </li>
            ))}
          </ul>
        )}
        <ThesisCorrectionForm thesisId={thesis.id} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Viva / Defence</h2>
        <VivaForm
          studentId={thesis.student_id}
          thesisId={thesis.id}
          existingId={viva?.id ?? null}
          defaultValues={viva ?? undefined}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Result Declaration</h2>
        <ResultDeclarationForm
          studentId={thesis.student_id}
          thesisId={thesis.id}
          existingId={resultDeclaration?.id ?? null}
          defaultValues={resultDeclaration ?? undefined}
        />
      </section>
    </div>
  );
}
