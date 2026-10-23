"use client";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { useSettings } from "@/lib/settings";

export default function ProfilePage() {
  const { loaded, t } = useSettings();
  if (!loaded) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_profile")}</h1>
      <ProfileForm />
      <Link href="/host" className="flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-center font-semibold text-brand">{t("host_link")} →</Link>
    </div>
  );
}
