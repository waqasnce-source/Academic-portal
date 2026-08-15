"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "../actions";

const initialState: SetPasswordState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-5 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Set Your Password</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose a password to finish setting up your account.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving..." : "Set password"}
      </button>
    </form>
  );
}
