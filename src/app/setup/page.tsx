"use client";
// Visitor onboarding wizard (guests and signed-in visitors). Ends on the planner.
import { ProfileForm } from "@/components/ProfileForm";
import { useSettings } from "@/lib/settings";

export default function SetupPage() {
  const { loaded, t } = useSettings();
  if (!loaded) return null;
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-lg pt-2">
        <h1 className="text-3xl font-medium">{t("app")}</h1>
        <p className="text-lg text-muted">{t("tagline")}</p>
      </div>
      <ProfileForm wizard />
    </div>
  );
}
