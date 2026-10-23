"use client";
// Screen 4: venue page. Verdict for THIS user first, then per-feature evidence (host and visitor kept apart),
// Google's label in its own box, and "Help verify this place".
import { use, useCallback, useEffect, useState } from "react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, ConfidenceTag, DummyBadge, VerdictBadge } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import type { TrackResult, Venue, VenueResult } from "@/lib/types";

function TrackCell({ tr }: { tr?: TrackResult }) {
  const { t } = useSettings();
  if (!tr) return <span className="text-muted">{t("no_data")}</span>;
  return (
    <div className="space-y-1">
      <VerdictBadge verdict={tr.verdict} size="sm" />
      <div><ConfidenceTag c={tr.confidence} /></div>
      <div className="text-xs text-muted">{tr.source_type.replace("_", " ")} · {tr.updated_at}</div>
      {tr.reasons.map((r) => <div key={r} className="text-xs">{r}</div>)}
    </div>
  );
}

export default function VenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { settings, loaded, t } = useSettings();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [result, setResult] = useState<VenueResult | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/venues/${id}?profile=${settings.profile}&companion=${settings.companion}`);
    if (!res.ok) return setError(true);
    const data = await res.json();
    setVenue(data.venue); setResult(data.result);
  }, [id, settings.profile, settings.companion]);

  useEffect(() => { if (loaded) load(); }, [loaded, load]);

  if (error) return <p>{t("error_generic")}</p>;
  if (!venue || !result) return <p className="text-muted">…</p>;

  const g = venue.google_says;
  const gRow = (label: string, v: boolean | null | undefined) => (
    <li>{label}: <strong>{v == null ? t("no_data") : v ? "✓" : "✕"}</strong></li>
  );
  const maps = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{venue.name}</h1>
          {venue.data_origin === "dummy" && <DummyBadge />}
        </div>
        {venue.name_ml && <p className="text-muted">{venue.name_ml}</p>}
        <p className="text-muted">{venue.address}</p>
        <div className="mt-3"><VerdictBadge verdict={result.verdict} size="lg" /></div>
        {result.reasons.length > 0 && <ul className="mt-3 space-y-0.5">{result.reasons.map((r) => <li key={r} className="text-red-800">✕ {r}</li>)}</ul>}
        {result.flags.map((f) => <p key={f.detail} className="mt-1 text-sm text-orange-800">⚑ {f.detail}</p>)}
        {result.unconfirmed.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">⚠ {t("unconfirmed")}: {result.unconfirmed.join(", ")}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <a href={maps} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">Google Maps ↗</a>
          {venue.phone && <a href={`tel:${venue.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand underline">{t("call")} {venue.phone}</a>}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-2 pr-2">{t("feature")}</th><th className="py-2 pr-2">{t("verdict")}</th>
                <th className="py-2 pr-2">{t("host")}</th><th className="py-2">{t("visitor")}</th>
              </tr>
            </thead>
            <tbody>
              {result.features.map((f) => (
                <tr key={f.feature} className="border-b border-line align-top">
                  <td className="py-2 pr-2 font-medium">
                    {t(`feature_${f.feature}` as const)}
                    <div className="text-xs text-muted">{f.level}</div>
                    {f.conflict && <div className="mt-1 text-xs font-semibold text-orange-700">⚑ {t("conflict")}</div>}
                  </td>
                  <td className="py-2 pr-2"><VerdictBadge verdict={f.verdict} size="sm" /></td>
                  <td className="py-2 pr-2"><TrackCell tr={f.tracks.host} /></td>
                  <td className="py-2"><TrackCell tr={f.tracks.visitor} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-slate-50">
        <h2 className="font-semibold">{t("google_says")} {g.simulated && <span className="text-xs text-muted">(simulated)</span>}</h2>
        <p className="mb-2 text-xs text-muted">{t("google_note")}</p>
        <ul className="grid grid-cols-2 gap-1 text-sm">
          {gRow("Wheelchair entrance", g.wheelchair_entrance)}
          {gRow("Parking", g.wheelchair_parking)}
          {gRow("Restroom", g.wheelchair_restroom)}
          {gRow("Seating", g.wheelchair_seating)}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("help_verify")}</h2>
        <PhotoUpload venueId={venue.id} onSaved={(r) => { setResult(r); load(); }} />
      </Card>
    </div>
  );
}
