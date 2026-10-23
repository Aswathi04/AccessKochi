"use client";
// Browse: venues ranked by verdict for this profile, then distance. Failing places hidden unless toggled.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, DummyBadge, VerdictBadge } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import type { Category, VenueResult } from "@/lib/types";

const CATS: Category[] = ["hospital", "auditorium", "restaurant", "metro", "water_metro", "mall", "grocery", "theatre", "government", "worship", "tourism"];

export default function DiscoverPage() {
  const { settings, loaded, t } = useSettings();
  const [cat, setCat] = useState<Category | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [results, setResults] = useState<VenueResult[] | null>(null);

  useEffect(() => {
    if (!loaded) return;
    const p = new URLSearchParams({ profile: settings.profile, companion: settings.companion, radius: "15" });
    if (settings.location) { p.set("lat", String(settings.location.lat)); p.set("lng", String(settings.location.lng)); }
    if (cat) p.set("category", cat);
    if (showExcluded) p.set("show_excluded", "1");
    fetch(`/api/venues?${p}`).then((r) => r.json()).then((d) => setResults(d.results)).catch(() => setResults([]));
  }, [loaded, settings.profile, settings.companion, settings.location, cat, showExcluded]);

  const chip = (label: string, on: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`rounded-full border px-3 py-1 text-sm ${on ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("browse_title")}</h1>
      <div className="flex flex-wrap gap-2">
        {chip(t("all"), cat === null, () => setCat(null))}
        {CATS.map((c) => chip(t(`cat_${c}` as const), cat === c, () => setCat(c)))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} />
        {t("show_excluded")}
      </label>
      {!results ? <p className="text-muted">…</p> : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r.venue_id}>
              <Link href={`/venue/${r.venue_id}`}>
                <Card className="hover:border-brand">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{r.name}</h2>
                    <VerdictBadge verdict={r.verdict} size="sm" />
                    <DummyBadge />
                    {r.distance_km != null && <span className="ml-auto text-sm text-muted">{r.distance_km} {t("km")}</span>}
                  </div>
                  {r.reasons[0] && <p className="mt-1 text-sm text-red-800">✕ {r.reasons[0]}</p>}
                  {r.unconfirmed.length > 0 && <p className="mt-1 text-sm text-amber-800">⚠ {r.unconfirmed.slice(0, 3).join(", ")}</p>}
                  {r.flags[0] && <p className="mt-1 text-sm text-orange-800">⚑ {r.flags[0].detail}</p>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
