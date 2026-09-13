"use client";

import { useRouter } from "next/navigation";

/**
 * Generic browser-history back button, shared across the management/
 * faculty/student layouts so it appears once, consistently, on every page
 * without touching each individual page.tsx. Uses router.back() (client-
 * side history), not a fixed href — distinct from the existing contextual
 * "← Back to X" links already on some pages, which intentionally go to a
 * specific known parent rather than wherever the browser happened to be.
 */
export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 underline hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
    >
      <span aria-hidden>←</span> Back
    </button>
  );
}
