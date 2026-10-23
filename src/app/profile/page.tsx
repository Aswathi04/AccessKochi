"use client";
import { ProfileForm } from "@/components/ProfileForm";
import { useSettings } from "@/lib/settings";

export default function ProfilePage() {
  const { loaded, t } = useSettings();
  if (!loaded) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_profile")}</h1>
      <ProfileForm />
    </div>
  );
}
