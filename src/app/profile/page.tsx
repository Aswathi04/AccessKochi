"use client";
import Link from "next/link";
import { ProfileForm } from "@/components/ProfileForm";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { hostConfigured, signOut, usesOf, useHostSession } from "@/lib/hostClient";
import { useSettings } from "@/lib/settings";

export default function ProfilePage() {
  const { loaded, t } = useSettings();
  const { session } = useHostSession();
  const router = useRouter();
  if (!loaded) return null;
  const uses = usesOf(session);
  const link = "flex min-h-12 items-center justify-center rounded-xl border border-line px-4 text-center font-semibold text-brand";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav_profile")}</h1>
      <ProfileForm />
      {hostConfigured && (session ? (
        <Card className="space-y-3">
          <p>{t("signed_in_as")} <strong className="break-all">{session.user.email}</strong></p>
          <Link href="/host" className={link}>{uses === "host" || uses === "both" ? t("open_host") : t("host_link")} →</Link>
          <button type="button" onClick={() => signOut(router)} className="min-h-12 w-full rounded-xl border border-line font-semibold">{t("sign_out")}</button>
        </Card>
      ) : (
        <Card className="space-y-3">
          <Link href="/signin?next=/profile" className={link}>{t("save_account")}</Link>
          <p className="text-center text-sm text-muted">{t("save_account_d")}</p>
          <Link href="/signin?next=/host" className={link}>{t("host_link")} →</Link>
        </Card>
      ))}
    </div>
  );
}
