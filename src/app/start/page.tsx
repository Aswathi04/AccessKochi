"use client";
// After sign-in: send each account to its dashboard. Admins by ADMIN_EMAILS (server), others by what they chose here once.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { hostFetch, setUses, usesOf, useRequireSession, type Uses } from "@/lib/hostClient";
import { useSettings } from "@/lib/settings";

const CHOICES: { id: Uses; icon: string }[] = [
  { id: "visitor", icon: "🗺️" },
  { id: "host", icon: "🏪" },
  { id: "both", icon: "🔁" },
];

export default function StartPage() {
  const { session } = useRequireSession();
  const { settings, loaded, t } = useSettings();
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const uses = usesOf(session);

  useEffect(() => {
    if (session) hostFetch<{ admin: boolean }>("/api/host/me").then((m) => setAdmin(m.admin)).catch((e) => setError(e.message));
  }, [session]);

  useEffect(() => {
    if (admin === null || !loaded) return;
    if (admin) router.replace("/admin");
    else if (uses === "host") router.replace("/host");
    else if (uses) router.replace(settings.onboarded ? "/plan" : "/setup");
  }, [admin, loaded, uses, settings.onboarded, router]);

  const choose = async (u: Uses) => {
    setBusy(true);
    const { error } = await setUses(u); // the session updates, and the effect above redirects
    if (error) { setError(error.message); setBusy(false); }
  };

  if (error) return <Card><p className="text-red-700" role="alert">{error}</p></Card>;
  if (admin !== false || uses) return <p className="text-muted">…</p>;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">{t("uses_q")}</h1>
      <div className="grid gap-3" role="radiogroup" aria-label={t("uses_q")}>
        {CHOICES.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={false} disabled={busy} onClick={() => choose(c.id)}
            className="flex min-h-20 items-center gap-4 rounded-2xl border-2 border-line bg-card p-4 text-left disabled:opacity-50">
            <span className="text-4xl" aria-hidden>{c.icon}</span>
            <span>
              <span className="block text-lg font-semibold">{t(`uses_${c.id}`)}</span>
              <span className="block text-sm text-muted">{t(`uses_${c.id}_d`)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
