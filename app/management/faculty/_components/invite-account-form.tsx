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
        <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Email to invite
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Sending..." : "Invite Account"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state?.message && <p className="w-full text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
