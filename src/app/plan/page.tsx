"use client";
// Screens 2 + 3: "What's on your mind?" and the plan result.
import Link from "next/link";
import { useState } from "react";
import { MicButton } from "@/components/MicButton";
import { Card, DummyBadge, PrimaryButton, VerdictBadge } from "@/components/ui";
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

  return (
    <div className="space-y-5">
      <Card>
        <label htmlFor="mind" className="mb-2 block text-2xl font-bold">
          {settings.name ? `${settings.name}, ` : ""}{t("mind_q")}
        </label>
        <textarea id="mind" value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t("mind_ph")}
          className="w-full rounded-xl border border-line p-3 text-lg"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); } }} />
        <div className="mt-2 flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button key={ex} type="button" onClick={() => { setText(ex); run(ex); }}
              className="rounded-full border border-line bg-bg px-3 py-1 text-sm">{ex}</button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <PrimaryButton onClick={() => run()} disabled={busy || !text.trim()}>{busy ? t("planning") : t("plan_btn")}</PrimaryButton>
          <MicButton onText={(s) => { setText(s); run(s); }} />
        </div>
        {error && <p className="mt-2 text-red-700" role="alert">{error}</p>}
      </Card>

      {plan && (
        <div className="space-y-4" aria-live="polite">
          {plan.clarifying_question && !plan.stops.length ? (
            <Card><p className="text-lg">{plan.clarifying_question}</p></Card>
          ) : (
            <>
              <Card className="bg-emerald-50">
                <h2 className="mb-1 text-xl font-bold">{t("your_plan")}</h2>
                <p className="text-base">{plan.summary}</p>
              </Card>

              <ol className="space-y-3">
                {plan.stops.map((s) => (
                  <li key={s.stop}>
                    <Card>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">{s.stop}</span>
                        <h3 className="text-lg font-semibold">{s.name}</h3>
                        <VerdictBadge verdict={s.verdict} />
                        {s.data_origin === "dummy" && <DummyBadge />}
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {s.area}
                        {s.distance_from_prev_km != null && ` · ~${s.distance_from_prev_km} ${t("km")} ${t("from_prev")}`}
                        {s.must_go && ` · ${t("your_destination")}`}
                      </p>
                      {s.highlights.length > 0 && (
                        <ul className="mt-2 space-y-0.5">{s.highlights.map((h) => <li key={h} className="text-emerald-800">✓ {h}</li>)}</ul>
                      )}
                      {s.reasons.length > 0 && (
                        <ul className="mt-2 space-y-0.5">{s.reasons.map((r) => <li key={r} className="text-red-800">✕ {r}</li>)}</ul>
                      )}
                      {s.flags.map((f) => <p key={f.detail} className="mt-1 text-sm text-orange-800">⚑ {f.detail}</p>)}
                      {s.unconfirmed.length > 0 && (
                        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
                          ⚠ {t("unconfirmed")}: {s.unconfirmed.join(", ")}
                          {s.call_ahead && <> · <a className="font-semibold underline" href={`tel:${s.call_ahead.replace(/[^\d+]/g, "")}`}>{t("call")} {s.call_ahead}</a></>}
                        </p>
                      )}
                      <Link href={`/venue/${s.venue_id}${q}`} className="mt-2 inline-block text-sm font-semibold text-brand underline">{t("view_venue")} →</Link>
                    </Card>
                  </li>
                ))}
              </ol>

              {plan.rejected.length > 0 && (
                <Card>
                  <h2 className="mb-2 font-semibold">{t("skipped")}</h2>
                  <ul className="space-y-1">
                    {plan.rejected.map((r) => (
                      <li key={r.venue_id} className="flex flex-wrap items-center gap-2">
                        <VerdictBadge verdict="fail" size="sm" />
                        <Link href={`/venue/${r.venue_id}${q}`} className="font-medium underline">{r.name}</Link>
                        <span className="text-muted">— {r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <p className="text-base font-medium">{t("anything_else")}</p>
              <ul className="text-sm text-muted">
                {plan.notes.map((n) => <li key={n}>· {n}</li>)}
                <li className="text-xs">· parsed: {plan.parsed_by} · summary: {plan.summary_by}</li>
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
