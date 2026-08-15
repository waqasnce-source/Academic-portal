"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function NewResearchProjectError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="New Research Project" />;
}
