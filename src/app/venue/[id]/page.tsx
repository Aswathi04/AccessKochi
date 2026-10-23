"use client";
// Screen 4: venue page. Verdict for THIS user first, then per-feature evidence (host and visitor kept apart),
// Google's label in its own box, and "Help verify this place".
import { use, useCallback, useEffect, useState } from "react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Card, ConfidenceTag, DummyBadge, VERDICT_STRIPE, VerdictBadge } from "@/components/ui";
import type { ReportRow } from "@/lib/host";
import { fill } from "@/lib/i18n";
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
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/venues/${id}?profile=${settings.profile}&companion=${settings.companion}`);
    if (!res.ok) return setError(true);
    const data = await res.json();
    setVenue(data.venue); setResult(data.result); setReports(data.reports ?? []);
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
      <button type="button" onClick={() => history.back()} className="min-h-11 text-sm font-semibold text-brand">← {t("back")}</button>
      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
        <div className="space-y-4">
          <Card className={`border-l-8 ${VERDICT_STRIPE[result.verdict]}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">{venue.name}</h1>
              {venue.data_origin === "dummy" && <DummyBadge />}
            </div>
            {venue.name_ml && <p className="text-muted">{venue.name_ml}</p>}
            <p className="text-sm text-muted">{venue.address}</p>
            <div className="mt-3"><VerdictBadge verdict={result.verdict} size="lg" /></div>
            {result.reasons.length > 0 && <ul className="mt-3 space-y-0.5">{result.reasons.map((r) => <li key={r} className="text-red-800">✕ {r}</li>)}</ul>}
            {result.flags.map((f) => <p key={f.detail} className="mt-1 text-sm text-orange-800">⚑ {f.detail}</p>)}
            {result.unconfirmed.length > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠ {t("unconfirmed")}: {result.unconfirmed.join(", ")}</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {venue.phone && (
                <a href={`tel:${venue.phone.replace(/[^\d+]/g, "")}`} className="flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold text-brand-ink">📞 {t("call")}</a>
              )}
              <a href={maps} target="_blank" rel="noreferrer" className={`flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold text-brand ${venue.phone ? "" : "col-span-2"}`}>🧭 {t("directions")}</a>
            </div>
          </Card>

          <h2 className="pt-2 text-lg font-bold">{t("features_title")}</h2>
          <ul className="space-y-3">
            {result.features.map((f) => (
              <li key={f.feature}>
                <Card className={`border-l-8 ${VERDICT_STRIPE[f.verdict]}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="mr-auto font-semibold">{t(`feature_${f.feature}` as const)}</h3>
                    <VerdictBadge verdict={f.verdict} size="sm" />
                  </div>
                  <p className="text-xs text-muted">{f.level}</p>
                  {f.conflict && <p className="mt-1 text-sm font-semibold text-orange-700">⚑ {t("conflict")}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3">
                    <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("host")}</p><TrackCell tr={f.tracks.host} /></div>
                    <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("visitor")}</p><TrackCell tr={f.tracks.visitor} /></div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
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

          {!!venue.documents_on_file?.length && (
            <Card>
              <h2 className="font-semibold">📄 {t("v_docs")}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {venue.documents_on_file.map((d) => (
                  <li key={d.kind + d.expires_on}>{d.label}{d.expires_on && <span className="text-muted"> · {fill(t("v_valid_until"), { d: d.expires_on })}</span>}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">{t("v_docs_note")}</p>
            </Card>
          )}

          {reports.length > 0 && (
            <Card>
              <h2 className="font-semibold">{t("v_reports")}</h2>
              <ul className="mt-2 divide-y divide-line">
                {reports.map((r) => (
                  <li key={r.id} className="space-y-1 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-auto font-medium">{t(`feature_${r.feature}`)}</span>
                      <ConfidenceTag c={r.reading_confidence} />
                    </div>
                    <p className="text-xs text-muted">{r.created_at.slice(0, 10)}</p>
                    {r.reasons.map((x) => <p key={x}>• {x}</p>)}
                    {r.host_reply && <p className="rounded-lg bg-bg p-2">{t("v_host_replied")} {r.host_reply}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-lg font-semibold">
                📷 {t("help_verify")}<span className="ml-auto text-muted transition group-open:rotate-180" aria-hidden>▾</span>
              </summary>
              <div className="mt-3"><PhotoUpload venueId={venue.id} onSaved={(r) => { setResult(r); load(); }} /></div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
