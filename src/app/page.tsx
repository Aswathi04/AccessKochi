"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hostConfigured, useHostSession } from "@/lib/hostClient";
import { useSettings } from "@/lib/settings";

// Welcome: sign in / sign up, or continue as a guest. Returning people skip it, like an app.
export default function Home() {
  const { settings, save, loaded, t } = useSettings();
  const { session, loading } = useHostSession();
  const router = useRouter();
  const skip = !!session || settings.onboarded;
  useEffect(() => {
    if (!loaded || loading) return;
    if (session) router.replace("/start");
    else if (settings.onboarded) router.replace("/plan");
  }, [loaded, loading, session, settings.onboarded, router]);
  if (!loaded || loading || skip) return null;

  const big = "flex min-h-14 w-full flex-col items-center justify-center rounded-md px-5 py-4 text-center text-lg font-medium";
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <div className="relative pt-24">
        {/* bioluminescent data orb (decorative) */}
        <div aria-hidden className="pointer-events-none absolute right-0 top-0 h-20 w-20">
          <div className="ui-orb h-full w-full rounded-full opacity-90 blur-[1px]" />
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_75%,rgba(250,209,255,0.55),transparent_55%)]" />
        </div>
        <p className="ui-kicker">Kochi · accessible trips</p>
        <h1 className="mt-3 text-[2.6rem] sm:text-5xl">{t("app")}</h1>
        <p className="mt-2 inline-block text-xl font-medium">{t("tagline")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label={t("lang_label")}>
        {(["ml", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => save({ language: l })} aria-pressed={settings.language === l}
            className={`ui-press min-h-12 rounded-full border font-medium ${settings.language === l ? "ui-chip border-brand bg-raise" : "border-line bg-card"}`}>
            {l === "ml" ? "മലയാളം" : "English"}
          </button>
        ))}
      </div>
      {hostConfigured && (
        <Link href="/signin" className={`${big} ui-press ui-aurora`}>
          {t("welcome_signin")}
          <span className="text-sm font-normal text-[#3a3a3a]">{t("welcome_signin_d")}</span>
        </Link>
      )}
      <Link href="/setup" className={`${big} ui-card ui-press bg-card text-ink`}>
        {t("welcome_guest")}
        <span className="text-sm font-normal text-muted">{t("welcome_guest_d")}</span>
      </Link>
      {hostConfigured && <p className="text-center text-sm text-muted">{t("welcome_host")}</p>}
    </div>
  );
}
