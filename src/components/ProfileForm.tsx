"use client";
// Screen 1: "What best describes you?" Language, name, profile, companion, starting point.
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

export function ProfileForm({ next = "/plan" }: { next?: string }) {
  const { settings, save, t } = useSettings();
  const router = useRouter();
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGeoMsg("—");
    navigator.geolocation.getCurrentPosition(
      (p) => { save({ location: { lat: p.coords.latitude, lng: p.coords.longitude }, area: null }); setGeoMsg(t("located")); },
      () => setGeoMsg(t("or_pick_area")),
      { timeout: 8000 },
    );
  };

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="mb-2 font-semibold">{t("lang_label")}</h2>
        <div className="flex gap-2">
          {(["ml", "en"] as const).map((l) => (
            <button key={l} type="button" onClick={() => save({ language: l })} aria-pressed={settings.language === l}
              className={`flex-1 rounded-xl border-2 px-4 py-3 text-lg font-semibold ${settings.language === l ? "border-brand bg-emerald-50" : "border-line"}`}>
              {l === "ml" ? "മലയാളം" : "English"}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <label htmlFor="name" className="mb-2 block font-semibold">{t("name_q")}</label>
        <input id="name" value={settings.name} onChange={(e) => save({ name: e.target.value })} placeholder={t("name_ph")}
          className="w-full rounded-xl border border-line px-4 py-3 text-lg" autoComplete="given-name" />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t("profile_q")}</h2>
        <div className="grid gap-3" role="radiogroup" aria-label={t("profile_q")}>
          {PROFILES.map((p) => {
            const on = settings.profile === p.id;
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => save({ profile: p.id })}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left ${on ? "border-brand bg-emerald-50" : "border-line bg-card"}`}>
                <span className="text-3xl" aria-hidden>{p.icon}</span>
                <span>
                  <span className="block text-lg font-semibold">{t(`p_${p.id}` as const)}</span>
                  <span className="block text-sm text-muted">{t(`p_${p.id}_d` as const)}</span>
                </span>
              </button>
            );
          })}
        </div>
        <label className="mt-4 flex items-center gap-3 text-base">
          <input type="checkbox" className="h-6 w-6" checked={settings.companion === "with_companion"}
            onChange={(e) => save({ companion: e.target.checked ? "with_companion" : "alone" })} />
          {t("companion_q")}
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">{t("location_q")}</h2>
        <button type="button" onClick={useMyLocation} className="mb-3 rounded-xl border border-line px-4 py-2 font-medium">📍 {t("use_location")}</button>
        {geoMsg && <p className="mb-2 text-sm text-muted">{geoMsg}</p>}
        <label className="block text-sm text-muted" htmlFor="area">{t("or_pick_area")}</label>
        <select id="area" value={settings.area ?? ""} className="mt-1 w-full rounded-xl border border-line px-3 py-3 text-base"
          onChange={(e) => {
            const a = AREA_LIST.find((x) => x.name === e.target.value);
            if (a) save({ area: a.name, location: { lat: a.lat, lng: a.lng } });
          }}>
          {!settings.area && <option value="">{t("located")}</option>}
          {AREA_LIST.map((a) => <option key={a.name} value={a.name}>{settings.language === "ml" ? a.ml : a.name}</option>)}
        </select>
      </Card>

      <PrimaryButton className="w-full text-lg" onClick={() => { save({ onboarded: true }); router.push(next); }}>
        {t("start")}
      </PrimaryButton>
    </div>
  );
}
