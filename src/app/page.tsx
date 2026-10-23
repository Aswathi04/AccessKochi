"use client";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { useSettings } from "@/lib/settings";

export default function Home() {
  const { settings, loaded, t } = useSettings();
  if (!loaded) return null;
  return (
    <div className="space-y-6">
      <div className="pt-4">
        <h1 className="text-3xl font-bold">{t("app")}</h1>
        <p className="text-lg text-muted">{t("tagline")}</p>
      </div>
      {settings.onboarded ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/plan" className="rounded-2xl bg-brand p-6 text-xl font-semibold text-brand-ink">🗺️ {t("nav_plan")}</Link>
          <Link href="/discover" className="rounded-2xl border border-line bg-card p-6 text-xl font-semibold">🔎 {t("nav_browse")}</Link>
          <Link href="/profile" className="text-sm text-muted underline sm:col-span-2">{t("nav_profile")}</Link>
        </div>
      ) : (
        <ProfileForm />
      )}
    </div>
  );
}
