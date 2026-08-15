"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function ProgramsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Program Management page crashed:", error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-900 dark:bg-red-950">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        Something went wrong loading Program Management.
      </p>
      <button
        onClick={() => retry()}
        className="mt-4 rounded-md border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900"
      >
        Try again
      </button>
    </div>
  );
}
