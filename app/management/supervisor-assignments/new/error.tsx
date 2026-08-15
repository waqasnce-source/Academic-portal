"use client";

import { ManagementErrorFallback } from "@/app/management/_components/error-fallback";

export default function NewSupervisorAssignmentError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ManagementErrorFallback error={error} retry={retry} moduleName="Assign Supervisor" />;
}
