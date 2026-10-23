"use client";
// Host venue page: live status switches, preview of what users see, and the guideline checklist.
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { HostSignIn } from "@/components/HostSignIn";
import { Card, PrimaryButton, VERDICT_STRIPE, VerdictBadge } from "@/components/ui";
import type { Answer, ChecklistItem, ChecklistSection } from "@/data/checklist";
import { hostConfigured, hostFetch, useHostSession } from "@/lib/hostClient";
import type { ProfileId, VenueResult } from "@/lib/types";

interface AnswerRow { item_id: string; answer: Answer; reason: string | null; values: Record<string, number>; photo_path: string | null }
interface StatusRow { kind: string; until: string; note: string | null }
interface Data {
  venue: { id: string; name: string; category: string; area: string; address: string };
  claim: { status: string; admin_note: string | null } | null;
  admin: boolean;
  readOnly: boolean;
  sections: ChecklistSection[];
  answers: AnswerRow[];
  photoUrls: Record<string, string>;
  status: StatusRow[];
  scores: { id: string; met: number; total: number; answered: number }[];
  preview: Record<ProfileId, VenueResult>;
}

const STATUS_KINDS = [
  { kind: "lift_out_of_order", label: "Lift out of order", icon: "🛗" },
  { kind: "ramp_blocked", label: "Ramp blocked", icon: "🚧" },
  { kind: "toilet_closed", label: "Accessible toilet closed", icon: "🚻" },
];
const DURATIONS = [{ h: 2, label: "2 hours" }, { h: 12, label: "Rest of today" }, { h: 72, label: "3 days" }, { h: 168, label: "1 week" }];
const PROFILE_LABEL: Record<ProfileId, string> = { wheelchair: "Wheelchair users", crutches: "Crutches / walker", low_stamina: "Low stamina" };
const ANSWER_LABEL: Record<Answer, string> = { yes: "We have this", no: "We don't", not_sure: "Not sure", na: "Doesn't apply" };

export default function HostVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { session, loading } = useHostSession();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => hostFetch<Data>(`/api/host/venues/${id}`).then(setData).catch((e) => setError(e.message)), [id]);
  useEffect(() => { if (session) load(); }, [session, load]);

  if (!hostConfigured) return <Card><p>The host dashboard isn&apos;t configured on this server yet.</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (!session) return <HostSignIn />;
  if (error) return <Card><p className="text-red-700">{error}</p><Link href="/host" className="mt-3 inline-block font-semibold text-brand">← Host dashboard</Link></Card>;
  if (!data) return <p className="text-muted">…</p>;

  const published = data.claim?.status === "approved";
  const ro = data.readOnly;
  const answers = Object.fromEntries(data.answers.map((a) => [a.item_id, a]));

  return (
    <div className="space-y-5">
      <Link href={ro ? "/admin" : "/host"} className="min-h-11 text-sm font-semibold text-brand">← {ro ? "Admin queue" : "Host dashboard"}</Link>
      {ro && <p className="rounded-xl bg-slate-100 p-4" role="status">Admin view: read-only. Answers can only be entered by the venue&apos;s host.</p>}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{data.venue.name}</h1>
        <p className="text-muted">{data.venue.address}</p>
      </div>
      {!published && !ro && (
        <p className="rounded-xl bg-amber-50 p-4 text-amber-900" role="status">
          Draft: your answers are saved but visitors won&apos;t see them until an admin approves your claim.
          {data.claim?.admin_note && <> Admin note: {data.claim.admin_note}</>}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        <div className="space-y-5 md:sticky md:top-24">
          <LiveStatus venueId={id} rows={data.status} onChange={load} readOnly={ro} />
          <Preview preview={data.preview} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Accessibility checklist</h2>
          <p className="text-sm text-muted">Each item is a requirement from the Harmonised Guidelines 2021 (HG) or the Kerala building rules (KPBR). Add a measurement or photo where you can: answers with a photo count for more.</p>
          {data.sections.map((s) => (
            <Section key={s.id} venueId={id} section={s} score={data.scores.find((x) => x.id === s.id)!} answers={answers} photoUrls={data.photoUrls} onSaved={load} readOnly={ro} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveStatus({ venueId, rows, onChange, readOnly }: { venueId: string; rows: StatusRow[]; onChange: () => void; readOnly: boolean }) {
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = (k: string) => rows.find((r) => r.kind === k && new Date(r.until) > new Date());
  const toggle = async (kind: string) => {
    setBusy(kind); setError(null);
    try {
      if (active(kind)) await hostFetch(`/api/host/venues/${venueId}/status?kind=${kind}`, { method: "DELETE" });
      else await hostFetch(`/api/host/venues/${venueId}/status`, { method: "PUT", body: JSON.stringify({ kind, hours }) });
      onChange();
    } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };
  return (
    <Card>
      <h2 className="text-lg font-bold">Right now</h2>
      <p className="text-sm text-muted">Tell visitors about problems today. Shows in their plans immediately.</p>
      {!readOnly && <label className="mt-3 block text-sm font-medium">For how long
        <select className="mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {DURATIONS.map((d) => <option key={d.h} value={d.h}>{d.label}</option>)}
        </select>
      </label>}
      <ul className="mt-3 space-y-2">
        {STATUS_KINDS.map((s) => {
          const a = active(s.kind);
          return (
            <li key={s.kind}>
              <button type="button" role="switch" aria-checked={!!a} disabled={readOnly || busy === s.kind} onClick={() => toggle(s.kind)}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 text-left font-semibold ${a ? "border-red-500 bg-red-50 text-red-900" : "border-line"}`}>
                <span aria-hidden className="text-2xl">{s.icon}</span>
                <span className="flex-1">{s.label}
                  {a && <span className="block text-xs font-normal">until {new Date(a.until).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}. Tap to clear.</span>}
                </span>
                <span className={`h-7 w-12 rounded-full p-1 ${a ? "bg-red-600" : "bg-line"}`} aria-hidden>
                  <span className={`block h-5 w-5 rounded-full bg-white transition ${a ? "translate-x-5" : ""}`} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-red-700" role="alert">{error}</p>}
    </Card>
  );
}

function Preview({ preview }: { preview: Record<ProfileId, VenueResult> }) {
  return (
    <Card>
      <h2 className="text-lg font-bold">What visitors see</h2>
      <p className="text-sm text-muted">Includes your answers, visitor reports and today&apos;s status.</p>
      <ul className="mt-3 space-y-3">
        {(Object.keys(PROFILE_LABEL) as ProfileId[]).map((p) => {
          const r = preview[p];
          return (
            <li key={p} className={`rounded-xl border border-line border-l-8 p-3 ${VERDICT_STRIPE[r.verdict]}`}>
              <div className="flex flex-wrap items-center gap-2"><span className="mr-auto font-semibold">{PROFILE_LABEL[p]}</span><VerdictBadge verdict={r.verdict} size="sm" /></div>
              {r.reasons.slice(0, 3).map((x) => <p key={x} className="text-sm text-red-800">✕ {x}</p>)}
              {r.unconfirmed.length > 0 && <p className="text-sm text-amber-900">⚠ Unconfirmed: {r.unconfirmed.slice(0, 4).join(", ")}</p>}
              {r.flags.filter((f) => f.kind === "conflict").map((f) => <p key={f.detail} className="text-sm text-orange-800">⚑ {f.detail}</p>)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Section({ venueId, section, score, answers, photoUrls, onSaved, readOnly }: {
  venueId: string; section: ChecklistSection; score: { met: number; total: number; answered: number };
  answers: Record<string, AnswerRow>; photoUrls: Record<string, string>; onSaved: () => void; readOnly: boolean;
}) {
  return (
    <Card>
      <details className="group" open={score.answered < section.items.length}>
        <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2">
          <span className="mr-auto">
            <span className="block text-lg font-semibold">{section.title}</span>
            <span className="block text-xs text-muted">{section.guideline}</span>
          </span>
          <span className="rounded-full bg-bg px-3 py-1 text-sm font-semibold">{score.met} of {score.total} met</span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <ul className="mt-3 divide-y divide-line">
          {section.items.map((i) => <Item key={i.id} venueId={venueId} item={i} saved={answers[i.id]} photoUrl={photoUrls[i.id]} onSaved={onSaved} readOnly={readOnly} />)}
        </ul>
      </details>
    </Card>
  );
}

function Item({ venueId, item, saved, photoUrl, onSaved, readOnly }: { venueId: string; item: ChecklistItem; saved?: AnswerRow; photoUrl?: string; onSaved: () => void; readOnly: boolean }) {
  const [answer, setAnswer] = useState<Answer | undefined>(saved?.answer);
  const [reason, setReason] = useState(saved?.reason ?? "");
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(Object.entries(saved?.values ?? {}).map(([k, v]) => [k, String(v)])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = answer !== saved?.answer || (reason || "") !== (saved?.reason ?? "") ||
    (item.inputs ?? []).some((inp) => (values[inp.key] ?? "") !== (saved?.values?.[inp.key] != null ? String(saved.values[inp.key]) : ""));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await hostFetch(`/api/host/venues/${venueId}`, { method: "PUT", body: JSON.stringify({ item_id: item.id, answer, reason, values }) });
      onSaved();
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  const upload = async (file: File) => {
    setBusy(true); setError(null);
    const form = new FormData(); form.append("item_id", item.id); form.append("file", file);
    try { await hostFetch(`/api/host/venues/${venueId}`, { method: "POST", body: form }); onSaved(); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  };

  return (
    <li className="py-4">
      <p className="font-medium">{item.text}</p>
      {item.target && <p className="text-sm">Requirement: <strong>{item.target}</strong></p>}
      <p className="text-xs text-muted">{item.source}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={item.text}>
        {(Object.keys(ANSWER_LABEL) as Answer[]).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={answer === a} disabled={readOnly} onClick={() => setAnswer(a)}
            className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${answer === a ? (a === "yes" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : a === "no" ? "border-red-600 bg-red-50 text-red-900" : "border-brand bg-bg") : "border-line"}`}>
            {ANSWER_LABEL[a]}
          </button>
        ))}
      </div>
      {answer === "na" && (
        <input aria-label="Why it doesn't apply" placeholder="Why it doesn't apply, e.g. entrance is level" value={reason} onChange={(e) => setReason(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-xl border border-line px-3" />
      )}
      {item.inputs && answer && answer !== "na" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.inputs.map((inp) => (
            <label key={inp.key} className="text-sm">{inp.label}
              <span className="mt-1 flex items-center gap-1">
                <input inputMode="decimal" value={values[inp.key] ?? ""} onChange={(e) => setValues({ ...values, [inp.key]: e.target.value.replace(/[^\d.]/g, "") })}
                  className="min-h-11 w-28 rounded-xl border border-line px-3" />
                <span className="text-muted">{inp.unit}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {dirty && answer && <PrimaryButton type="button" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryButton>}
        {saved && !dirty && !readOnly && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm font-semibold">
            📷 {saved.photo_path ? "Replace photo" : "Add photo"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        )}
        {saved && !dirty && <span className="text-sm text-emerald-800">✓ Saved{saved.photo_path ? " with photo" : ", self-declared"}</span>}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={`Photo for: ${item.text}`} className="h-16 w-16 rounded-lg object-cover" />
        )}
      </div>
      {error && <p className="mt-1 text-red-700" role="alert">{error}</p>}
    </li>
  );
}
