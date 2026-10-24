"use client";
// "Help verify this place": photo -> Gemma (Neysa) reads it -> structured feature + confidence.
import { useState } from "react";
import { useSettings } from "@/lib/settings";
import type { VisionOutput } from "@/lib/vision";
import type { VenueResult } from "@/lib/types";
import { ConfidenceTag, PrimaryButton } from "./ui";

const FEATURES = ["entrance", "ramp", "toilet", "lift", "dropoff_path"] as const;
const REFS = [
  { id: "none", key: "ref_none" },
  { id: "a4_sheet", key: "ref_a4" },
  { id: "phone_upright", key: "ref_phone" },
  { id: "standard_door", key: "ref_door" },
] as const;

async function resizeToJpeg(file: File, max = 1024): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("resize failed"))), "image/jpeg", 0.85));
}

export function PhotoUpload({ venueId, onSaved }: { venueId: string; onSaved: (r: VenueResult) => void }) {
  const { settings, t } = useSettings();
  const [feature, setFeature] = useState<(typeof FEATURES)[number]>("ramp");
  const [reference, setReference] = useState<string>("none");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [save, setSave] = useState(true);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ output: VisionOutput; raise_hint: string | null; saved: boolean; provider: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readTilt = async () => {
    try {
      const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof DOE.requestPermission === "function" && (await DOE.requestPermission()) !== "granted") return;
      const handler = (e: DeviceOrientationEvent) => {
        if (e.beta == null) return;
        let b = Math.abs(e.beta);
        if (b > 90) b = 180 - b;
        setTilt(Math.round(b * 10) / 10);
        window.removeEventListener("deviceorientation", handler);
      };
      window.addEventListener("deviceorientation", handler);
    } catch {
      setTilt(null);
    }
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true); setError(null); setOut(null);
    try {
      const form = new FormData();
      form.append("image", await resizeToJpeg(file), "photo.jpg");
      form.append("venue_id", venueId);
      form.append("feature", feature);
      form.append("reference", reference);
      if (tilt != null && feature === "ramp") form.append("tilt_deg", String(tilt));
      form.append("profile", settings.profile);
      form.append("companion", settings.companion);
      if (save) form.append("save", "1");
      const res = await fetch("/api/vision", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "failed");
      setOut(data);
      if (data.saved && data.result) onSaved(data.result);
    } catch (e) {
      setError((e as Error).message || t("error_generic"));
    } finally {
      setBusy(false);
    }
  };

  const sel = "mt-1 min-h-12 w-full ui-field rounded-xl px-3";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">{t("which_feature")}
          <select className={sel} value={feature} onChange={(e) => setFeature(e.target.value as typeof feature)}>
            {FEATURES.map((f) => <option key={f} value={f}>{t(`feature_${f}` as const)}</option>)}
          </select>
        </label>
        <label className="block text-sm">{t("reference")}
          <select className={sel} value={reference} onChange={(e) => setReference(e.target.value)}>
            {REFS.map((r) => <option key={r.id} value={r.id}>{t(r.key)}</option>)}
          </select>
        </label>
        {feature === "ramp" && (
          <div className="text-sm">
            <p>{t("tilt")}</p>
            <p className="text-sm text-muted">{t("tilt_help")}</p>
            <button type="button" onClick={readTilt} className="mt-1 min-h-11 rounded-full border-2 border-brand px-4 font-bold text-brand">{t("tilt_read")}</button>
            {tilt != null && <span className="ml-2 font-bold">{tilt}°</span>}
          </div>
        )}
      </div>

      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-control bg-card p-6 text-center hover:bg-soft-blue has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-brand">
        <span className="font-bold">📷 {t("take_photo")}</span>
        <input type="file" accept="image/*" className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f); setOut(null);
            setPreview(f ? URL.createObjectURL(f) : null);
          }} />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt="" className="max-h-64 rounded-xl" />}

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand" />
        {t("save_evidence")}
      </label>
      <PrimaryButton onClick={submit} disabled={!file || busy}>{busy ? t("reading") : t("read_photo")}</PrimaryButton>
      {error && <p className="text-bad" role="alert">{error}</p>}

      {out && (
        <div className="rounded-xl bg-deep p-3 text-sm" aria-live="polite">
          <div className="mb-1 flex items-center gap-2"><ConfidenceTag c={out.output.reading_confidence} /><span className="text-sm text-muted">{out.provider}</span></div>
          <ul>
            {Object.entries(out.output.attributes).map(([k, v]) => (
              <li key={k}><span className="text-muted">{k}:</span> {v === null ? t("cant_tell") : String(v)}</li>
            ))}
          </ul>
          {out.output.reasons.length > 0 && <p className="mt-1 text-muted">{out.output.reasons.join(" · ")}</p>}
          {out.raise_hint && <p className="mt-2 font-bold text-brand">↑ {out.raise_hint}</p>}
          {out.saved && <p className="mt-2 font-bold text-good">✓ {t("saved")}</p>}
        </div>
      )}
    </div>
  );
}
