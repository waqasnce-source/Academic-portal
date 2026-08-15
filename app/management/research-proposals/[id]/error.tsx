"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function ResearchProposalDetailError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Research Project" />;
}
