"use client";

import { useActionState } from "react";
import { inviteFacultyAccountAction, type InviteAccountFormState } from "../actions";

export function InviteFacultyAccountForm({ facultyId, defaultEmail }: { facultyId: string; defaultEmail: string }) {
  const boundAction = inviteFacultyAccountAction.bind(null, facultyId);
  const [state, formAction, pending] = useActionState<InviteAccountFormState | undefined, FormData>(
    boundAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64">
        <label htmlFor="invite_email" className="block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Email to invite
        </label>
        <input
          id="invite_email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand-800 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Sending..." : "Invite Account"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
