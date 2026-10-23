"use client";
// Screens 2 + 3: "What's on your mind?" and the plan result.
// Phone: big mic first, then the plan as stacked cards. Desktop: composer left, plan right.
import Link from "next/link";
import { useState } from "react";
import { MicButton } from "@/components/MicButton";
import { Card, DummyBadge, VERDICT_STRIPE, VerdictBadge } from "@/components/ui";
import { useSettings } from "@/lib/settings";
import type { Plan } from "@/lib/agent";

export default function PlanPage() {
  const { settings, t } = useSettings();
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (q = text) => {
    if (!q.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q, profile: settings.profile, companion: settings.companion, language: settings.language, location: settings.location }),
      });
      if (!res.ok) throw new Error();
      setPlan(await res.json());
    } catch {
      setError(t("error_generic"));
    } finally {
      setBusy(false);
    }
  };

  const examples = [t("ex1"), t("ex2"), t("ex3")];
  const q = `?profile=${settings.profile}&companion=${settings.companion}`;

  const composer = (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold md:text-3xl">
        {settings.name ? `${settings.name}, ` : ""}{t("mind_q")}
      </h1>
      {!plan && <div className="py-4"><MicButton big onText={(s) => { setText(s); run(s); }} /></div>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <label htmlFor="mind" className="sr-only">{t("mind_q")}</label>
        <textarea id="mind" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t("or_type")}
          className="min-h-14 flex-1 resize-none rounded-2xl border border-line bg-card px-4 py-3 text-lg"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} />
        <button type="submit" disabled={busy || !text.trim()} aria-label={t("plan_btn")}
          className="min-h-14 w-14 shrink-0 rounded-2xl bg-brand text-2xl text-brand-ink disabled:opacity-40">{busy ? "…" : "➜"}</button>
      </form>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {examples.map((ex) => (
          <button key={ex} type="button" onClick={() => { setText(ex); run(ex); }}
            className="min-h-11 shrink-0 rounded-full border border-line bg-card px-4 py-2 text-left text-sm md:shrink">{ex}</button>
        ))}
      </div>
      {busy && <p className="text-muted" aria-live="polite">{t("planning")}</p>}
      {error && <p className="text-red-700" role="alert">{error}</p>}
      {plan && (
        <div className="flex items-center gap-3">
          <MicButton onText={(s) => { setText(s); run(s); }} />
          <button type="button" onClick={() => { setPlan(null); setText(""); }} className="min-h-12 rounded-xl border border-line px-4 font-semibold">
            {t("new_plan")}
          </button>
        </div>
      )}
    </div>
  );

  if (!plan) return <div className="mx-auto max-w-lg">{composer}</div>;

  return (
    // phone order: summary, stops, composer. Desktop: summary + composer left, stops right.
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
      <div className="contents md:col-start-1 md:block md:space-y-6">
        {plan.stops.length > 0 && (
          <Card className="order-1 border-emerald-200 bg-emerald-50">
            <h2 className="mb-1 text-lg font-bold">{t("your_plan")}</h2>
            <p>{plan.summary}</p>
          </Card>
        )}
        <div className="order-3">{composer}</div>
      </div>

      <div className="order-2 space-y-4 md:col-start-2 md:row-start-1" aria-live="polite">
        {plan.clarifying_question && !plan.stops.length ? (
          <Card><p className="text-lg">{plan.clarifying_question}</p></Card>
        ) : (
          <>
            <ol className="space-y-3">
              {plan.stops.map((s) => (
                <li key={s.stop}>
                  <Card className={`border-l-8 ${VERDICT_STRIPE[s.verdict]}`}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{s.stop}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold leading-tight">{s.name}</h3>
                        <p className="text-sm text-muted">
                          {s.area}
                          {s.distance_from_prev_km != null && ` · ~${s.distance_from_prev_km} ${t("km")} ${t("from_prev")}`}
                          {s.must_go && ` · ${t("your_destination")}`}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <VerdictBadge verdict={s.verdict} />
                          {s.data_origin === "dummy" && <DummyBadge />}
                        </div>
                      </div>
                    </div>
                    {s.reasons.length > 0 && <ul className="mt-3 space-y-0.5">{s.reasons.map((r) => <li key={r} className="text-red-800">✕ {r}</li>)}</ul>}
                    {s.highlights.length > 0 && <ul className="mt-2 space-y-0.5">{s.highlights.map((h) => <li key={h} className="text-emerald-800">✓ {h}</li>)}</ul>}
                    {s.flags.map((f) => <p key={f.detail} className="mt-1 text-sm text-orange-800">⚑ {f.detail}</p>)}
                    {s.unconfirmed.length > 0 && (
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠ {t("unconfirmed")}: {s.unconfirmed.join(", ")}</p>
                    )}
                    <div className="mt-3 flex gap-2">
                      {s.call_ahead && (
                        <a href={`tel:${s.call_ahead.replace(/[^\d+]/g, "")}`} className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-amber-100 font-semibold text-amber-900">
                          📞 {t("call")}
                        </a>
                      )}
                      <Link href={`/venue/${s.venue_id}${q}`} className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-line font-semibold text-brand">
                        {t("view_venue")} →
                      </Link>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>

            {plan.rejected.length > 0 && (
              <Card>
                <h2 className="mb-2 font-semibold">{t("skipped")}</h2>
                <ul className="divide-y divide-line">
                  {plan.rejected.map((r) => (
                    <li key={r.venue_id}>
                      <Link href={`/venue/${r.venue_id}${q}`} className="flex min-h-12 flex-col justify-center py-2">
                        <span className="font-medium">✕ {r.name}</span>
                        <span className="text-sm text-muted">{r.reason}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <ul className="space-y-1 text-sm text-muted">
              {plan.notes.map((n) => <li key={n}>· {n}</li>)}
              <li className="text-xs">· parsed: {plan.parsed_by} · summary: {plan.summary_by}</li>
            </ul>
          </>
        )}
      </div>

    </div>
  );
}
