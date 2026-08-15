"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function GradingScaleError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Grading Scale" />;
}
