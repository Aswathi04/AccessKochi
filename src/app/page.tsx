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

  const big = "flex min-h-14 w-full flex-col items-center justify-center rounded-2xl px-5 py-3 text-center text-lg font-semibold";
  return (
    <div className="mx-auto max-w-md space-y-6 pt-6">
      <div>
        <h1 className="text-4xl font-bold">{t("app")}</h1>
        <p className="mt-1 text-xl text-muted">{t("tagline")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3" role="group" aria-label={t("lang_label")}>
        {(["ml", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => save({ language: l })} aria-pressed={settings.language === l}
            className={`min-h-12 rounded-2xl border-2 font-semibold ${settings.language === l ? "border-brand bg-emerald-50" : "border-line"}`}>
            {l === "ml" ? "മലയാളം" : "English"}
          </button>
        ))}
      </div>
      {hostConfigured && (
        <Link href="/signin" className={`${big} bg-brand text-brand-ink`}>
          {t("welcome_signin")}
          <span className="text-sm font-normal opacity-90">{t("welcome_signin_d")}</span>
        </Link>
      )}
      <Link href="/setup" className={`${big} border-2 border-line bg-card`}>
        {t("welcome_guest")}
        <span className="text-sm font-normal text-muted">{t("welcome_guest_d")}</span>
      </Link>
      {hostConfigured && <p className="text-center text-sm text-muted">{t("welcome_host")}</p>}
    </div>
  );
}
