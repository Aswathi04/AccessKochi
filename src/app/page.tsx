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

  const big = "flex min-h-16 w-full flex-col items-center justify-center rounded-3xl px-5 py-4 text-center text-lg font-bold";
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-brand px-6 pb-8 pt-28 text-brand-ink">
        {/* decorative shapes, kept clear of the text */}
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 bg-red ui-blob" />
        <div aria-hidden className="pointer-events-none absolute right-24 top-6 h-10 w-10 rounded-full bg-bg" />
        <p className="text-sm font-bold text-brand-ink/90">Kochi · accessible trips</p>
        <h1 className="mt-2 text-[clamp(2.5rem,9vw,4rem)] !text-brand-ink">{t("app")}</h1>
        <p className="mt-2 text-xl font-bold">{t("tagline")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label={t("lang_label")}>
        {(["ml", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => save({ language: l })} aria-pressed={settings.language === l}
            className={`ui-press min-h-12 rounded-full border-2 font-bold ${settings.language === l ? "border-brand bg-brand text-brand-ink" : "border-brand bg-transparent text-brand"}`}>
            {l === "ml" ? "മലയാളം" : "English"}
          </button>
        ))}
      </div>
      {hostConfigured && (
        <Link href="/signin" className={`${big} ui-press ui-aurora`}>
          {t("welcome_signin")}
          <span className="text-sm font-normal text-white">{t("welcome_signin_d")}</span>
        </Link>
      )}
      <Link href="/setup" className={`${big} ui-press border-2 border-brand bg-card text-brand`}>
        {t("welcome_guest")}
        <span className="text-sm font-normal text-muted">{t("welcome_guest_d")}</span>
      </Link>
      {hostConfigured && <p className="text-center text-sm text-muted">{t("welcome_host")}</p>}
    </div>
  );
}
