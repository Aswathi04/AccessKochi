"use client";
// Browse: venues ranked by verdict for this profile, then distance. Failing places hidden unless toggled.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, DummyBadge, VERDICT_STRIPE, VerdictBadge } from "@/components/ui";
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
    <button key={label} type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-[0.9375rem] font-bold ${on ? "border-brand bg-brand text-brand-ink" : "border-control bg-card text-brand hover:bg-soft-blue"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("browse_title")}</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {chip(t("all"), cat === null, () => setCat(null))}
        {CATS.map((c) => chip(t(`cat_${c}` as const), cat === c, () => setCat(c)))}
      </div>
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" className="h-6 w-6 accent-[var(--brand)]" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} />
        {t("show_excluded")}
      </label>
      {!results ? <p className="text-muted">…</p> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {results.map((r) => (
            <li key={r.venue_id}>
              <Link href={`/venue/${r.venue_id}`} className="block h-full">
                <Card className={`h-full border-l-8 hover:border-brand ${VERDICT_STRIPE[r.verdict]}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="mr-auto font-bold">{r.name}</h2>
                    <VerdictBadge verdict={r.verdict} size="sm" />
                    <DummyBadge />
                    {r.distance_km != null && <span className="text-sm text-muted">{r.distance_km} {t("km")}</span>}
                  </div>
                  {r.reasons[0] && <p className="mt-1 text-sm text-bad">✕ {r.reasons[0]}</p>}
                  {r.unconfirmed.length > 0 && <p className="mt-1 text-sm text-warn">⚠ {r.unconfirmed.slice(0, 3).join(", ")}</p>}
                  {r.flags[0] && <p className="mt-1 text-sm text-flag">⚑ {r.flags[0].detail}</p>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
