import { requireRole } from "@/lib/supabase/dal";
import { getSystemSettings } from "@/lib/management/settings";
import { SettingsForm } from "./_components/settings-form";
import { ErrorBanner } from "@/app/management/_components/error-banner";

export default async function ManagementSettingsPage() {
  await requireRole("management");

  const { settings, error } = await getSystemSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          System Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Institution-wide configuration. Only management can change these values.
        </p>
      </div>

      {error || !settings ? (
        <ErrorBanner message={error ?? "Could not load system settings."} />
      ) : (
        <SettingsForm settings={settings} />
      )}
    </div>
  );
}
