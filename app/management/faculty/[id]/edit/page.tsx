import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/dal";
import { getFacultyById, getFacultyFilterOptions } from "@/lib/management/faculty";
import { getLinkedAccountInfo, getUnlinkedProfiles, getAuthConfirmationState } from "@/lib/management/accounts";
import { UUID_RE } from "@/lib/management/query-params";
import { StatusBadge } from "@/app/management/_components/status-badge";
import { FacultyForm } from "../../_components/faculty-form";
import { LinkFacultyAccountForm } from "../../_components/link-account-form";
import { InviteFacultyAccountForm } from "../../_components/invite-account-form";
import { updateFacultyAction, toggleAccountStatusAction } from "../../actions";

export default async function EditFacultyPage(props: PageProps<"/management/faculty/[id]/edit">) {
  await requireRole("management");

  const { id } = await props.params;
  if (!UUID_RE.test(id)) notFound();

  const [faculty, { departments }, linkedAccount] = await Promise.all([
    getFacultyById(id),
    getFacultyFilterOptions(),
    getLinkedAccountInfo("faculty", id),
  ]);
  if (!faculty) notFound();
  const unlinkedProfiles = linkedAccount ? [] : await getUnlinkedProfiles("faculty");
  const authConfirmation = linkedAccount ? await getAuthConfirmationState(linkedAccount.profileId) : null;

  const action = updateFacultyAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/management/faculty" className="text-sm text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-50">
          ← Faculty
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Edit Faculty</h1>
      </div>
      <FacultyForm action={action} departments={departments} defaultValues={faculty} submitLabel="Save changes" />

      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Account / Identity</h2>
        {linkedAccount ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Linked to <span className="font-medium">{linkedAccount.fullName}</span> ({linkedAccount.email})
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {authConfirmation === null
                  ? "Invitation status could not be determined."
                  : authConfirmation.emailConfirmed
                    ? "Invitation accepted — password set."
                    : "Invitation sent — waiting for the account holder to set a password."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {authConfirmation && !authConfirmation.emailConfirmed && <StatusBadge label="Invitation pending" tone="warning" />}
              <StatusBadge
                label={linkedAccount.status}
                tone={linkedAccount.status === "active" ? "success" : linkedAccount.status === "suspended" ? "danger" : "neutral"}
              />
              <form
                action={toggleAccountStatusAction.bind(
                  null,
                  id,
                  linkedAccount.profileId,
                  linkedAccount.status === "suspended" ? "active" : "suspended"
                )}
              >
                <button type="submit" className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                  {linkedAccount.status === "suspended" ? "Reactivate account" : "Suspend account"}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Invite a new account
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Sends an email invitation. The faculty member sets their own password by following the link —
                Management never sets or sees a password.
              </p>
              <InviteFacultyAccountForm facultyId={id} defaultEmail={faculty.email ?? ""} />
            </div>
            <div className="space-y-2 border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Or link an existing account
              </p>
              <LinkFacultyAccountForm facultyId={id} options={unlinkedProfiles} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
