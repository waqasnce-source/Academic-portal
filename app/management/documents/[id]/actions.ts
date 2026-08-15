"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { reviewDocumentSubmission, getDocumentSubmissionById } from "@/lib/management/documents";
import { notifyIfLinked } from "@/lib/management/notifications";
import { getStudentById } from "@/lib/management/students";
import { UUID_RE } from "@/lib/management/query-params";

export interface DocumentReviewFormState {
  error?: string;
}

const REVIEW_OUTCOMES = ["approved", "corrections_required"] as const;

export async function reviewDocumentSubmissionAction(
  submissionId: string,
  _prevState: DocumentReviewFormState | undefined,
  formData: FormData
): Promise<DocumentReviewFormState> {
  const profile = await requireRole("management");

  if (!UUID_RE.test(submissionId)) return { error: "Invalid submission." };

  const rawOutcome = String(formData.get("outcome") ?? "").trim();
  if (!(REVIEW_OUTCOMES as readonly string[]).includes(rawOutcome)) {
    return { error: "Please choose Accept or Request Correction." };
  }

  const rawRemarks = String(formData.get("remarks") ?? "").trim();
  if (rawOutcome === "corrections_required" && !rawRemarks) {
    return { error: "Please explain what needs to be corrected." };
  }
  if (rawRemarks.length > 2000) return { error: "Comments must be 2000 characters or fewer." };

  const submission = await getDocumentSubmissionById(submissionId);

  const { error } = await reviewDocumentSubmission(submissionId, {
    status: rawOutcome as "approved" | "corrections_required",
    remarks: rawRemarks || null,
    reviewerId: profile.id,
  });

  if (error) {
    console.error("reviewDocumentSubmissionAction failed:", error);
    return { error: "Could not save the review. Please try again." };
  }

  if (submission) {
    const student = await getStudentById(submission.student.id);
    const outcomeLabel = rawOutcome === "approved" ? "accepted" : "sent back for correction";
    await notifyIfLinked(
      student?.profile_id ?? null,
      "Document Review Update",
      `Your submission for "${submission.requirement.document_name}" has been ${outcomeLabel}.`
    );
  }

  revalidatePath("/management/documents");
  revalidatePath(`/management/documents/${submissionId}`);
  redirect("/management/documents");
}
