"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/**
 * Shared error-boundary body for modules built from Semesters onward.
 * Next.js requires error.tsx as its own file per route segment, so each
 * module still has a thin error.tsx that renders this.
 */
export function ManagementErrorFallback({
  error,
  retry,
  moduleName,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  moduleName: string;
}) {
  useEffect(() => {
    console.error(`${moduleName} page crashed:`, error);
  }, [error, moduleName]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center dark:border-red-900 dark:bg-red-950">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">
        Something went wrong loading {moduleName}.
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
