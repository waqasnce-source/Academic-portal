"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "../actions";

const initialState: SetPasswordState = {};

export function SetPasswordForm() {
  const [state, formAction, pending] = useActionState(setPasswordAction, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm space-y-5 rounded-lg border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Set Your Password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose a password to finish setting up your account.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:text-slate-50"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:text-slate-50"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {pending ? "Saving..." : "Set password"}
      </button>
    </form>
  );
}
