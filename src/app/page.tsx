"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import { useSettings } from "@/lib/settings";

// First run: onboarding wizard. After that, "/" opens straight on the planner, like an app.
export default function Home() {
  const { settings, loaded, t } = useSettings();
  const router = useRouter();
  useEffect(() => { if (loaded && settings.onboarded) router.replace("/plan"); }, [loaded, settings.onboarded, router]);
  if (!loaded || settings.onboarded) return null;
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-lg pt-2">
        <h1 className="text-3xl font-bold">{t("app")}</h1>
        <p className="text-lg text-muted">{t("tagline")}</p>
      </div>
      <ProfileForm wizard />
    </div>
  );
}
