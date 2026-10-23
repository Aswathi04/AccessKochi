"use client";
// Screen 1: "What best describes you?" Language, name, profile, companion, starting point.
// wizard: one step per screen (first run). Otherwise all sections on one page (Profile tab).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { AREA_LIST } from "@/lib/areas";
import type { ProfileId } from "@/lib/types";
import { Card, PrimaryButton } from "./ui";

const PROFILES: { id: ProfileId; icon: string }[] = [
  { id: "wheelchair", icon: "♿" },
  { id: "crutches", icon: "🦯" },
  { id: "low_stamina", icon: "🪑" },
];

export function ProfileForm({ next = "/plan", wizard = false }: { next?: string; wizard?: boolean }) {
  const { settings, save, t } = useSettings();
  const router = useRouter();
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("—");
    navigator.geolocation.getCurrentPosition(
      (p) => { save({ location: { lat: p.coords.latitude, lng: p.coords.longitude }, area: null }); setGeoMsg(t("located")); },
      () => setGeoMsg(t("or_pick_area")),
      { timeout: 8000 },
    );
  };

  const sections = [
    <Card key="lang">
      <h2 className="mb-3 text-xl font-bold">{t("lang_label")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {(["ml", "en"] as const).map((l) => (
          <button key={l} type="button" onClick={() => save({ language: l })} aria-pressed={settings.language === l}
            className={`min-h-16 rounded-2xl border-2 px-4 text-xl font-semibold ${settings.language === l ? "border-brand bg-emerald-50" : "border-line"}`}>
            {l === "ml" ? "മലയാളം" : "English"}
          </button>
        ))}
      </div>
      <label htmlFor="name" className="mt-6 mb-2 block text-xl font-bold">{t("name_q")}</label>
      <input id="name" value={settings.name} onChange={(e) => save({ name: e.target.value })} placeholder={t("name_ph")}
        className="min-h-14 w-full rounded-xl border border-line px-4 text-lg" autoComplete="given-name" />
    </Card>,

    <Card key="profile">
      <h2 className="mb-3 text-xl font-bold">{t("profile_q")}</h2>
      <div className="grid gap-3" role="radiogroup" aria-label={t("profile_q")}>
        {PROFILES.map((p) => {
          const on = settings.profile === p.id;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => save({ profile: p.id })}
              className={`flex min-h-20 items-center gap-4 rounded-2xl border-2 p-4 text-left ${on ? "border-brand bg-emerald-50" : "border-line bg-card"}`}>
              <span className="text-4xl" aria-hidden>{p.icon}</span>
              <span>
                <span className="block text-lg font-semibold">{t(`p_${p.id}` as const)}</span>
                <span className="block text-sm text-muted">{t(`p_${p.id}_d` as const)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <label className="mt-4 flex min-h-12 items-center gap-3 text-base">
        <input type="checkbox" className="h-6 w-6 accent-[var(--brand)]" checked={settings.companion === "with_companion"}
          onChange={(e) => save({ companion: e.target.checked ? "with_companion" : "alone" })} />
        {t("companion_q")}
      </label>
    </Card>,

    <Card key="loc">
      <h2 className="mb-3 text-xl font-bold">{t("location_q")}</h2>
      <button type="button" onClick={useMyLocation} className="min-h-12 w-full rounded-xl border-2 border-brand px-4 font-semibold text-brand">📍 {t("use_location")}</button>
      {geoMsg && <p className="mt-2 text-sm text-muted">{geoMsg}</p>}
      <p className="mt-4 mb-2 text-sm text-muted">{t("or_pick_area")}</p>
      <div className="flex flex-wrap gap-2">
        {AREA_LIST.map((a) => (
          <button key={a.name} type="button" aria-pressed={settings.area === a.name}
            onClick={() => save({ area: a.name, location: { lat: a.lat, lng: a.lng } })}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${settings.area === a.name ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>
            {settings.language === "ml" ? a.ml : a.name}
          </button>
        ))}
      </div>
    </Card>,
  ];

  const finish = () => { save({ onboarded: true }); router.push(next); };

  if (!wizard) {
    return (
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {sections}
        <PrimaryButton className="w-full text-lg md:col-span-2" onClick={finish}>{t("start")}</PrimaryButton>
      </div>
    );
  }

  const last = step === sections.length - 1;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-1.5" aria-label={`${step + 1} / ${sections.length}`}>
        {sections.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />)}
      </div>
      {sections[step]}
      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="min-h-12 rounded-xl border border-line px-5 font-semibold">{t("back")}</button>
        )}
        <PrimaryButton className="flex-1 text-lg" onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? t("start") : t("continue")}
        </PrimaryButton>
      </div>
    </div>
  );
}
