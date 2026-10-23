"use client";
// Host venue page: live status, preview of what visitors see, and tabs for the guideline checklist,
// documents, visitor reports (with replies) and insights.
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { Card, ConfidenceTag, PrimaryButton, VERDICT_STRIPE, VerdictBadge } from "@/components/ui";
import type { Answer, ChecklistItem, ChecklistSection } from "@/data/checklist";
import { DOC_KINDS, NOT_ACCEPTED, NOT_ACCEPTED_ML, type DocKind } from "@/data/documents";
import type { AiCheck, RankedFix, ReportRow } from "@/lib/host";
import { hostConfigured, hostFetch, useRequireSession } from "@/lib/hostClient";
import { fill, type StringKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import type { ProfileId, VenueResult } from "@/lib/types";

interface AnswerRow { item_id: string; answer: Answer; reason: string | null; values: Record<string, number>; photo_path: string | null; ai_check?: AiCheck | null }
interface StatusRow { kind: string; until: string; note: string | null }
interface DocRow { id: string; kind: DocKind; ref_no: string | null; issued_by: string | null; issued_on: string | null; expires_on: string | null; sections: string[]; status: string; admin_note: string | null; valid: boolean; file_url: string | null }
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
  documents: DocRow[];
  documentsReady: boolean;
  reports: ReportRow[];
  insights: { skips: { profile: ProfileId; count: number; top_reason: string | null }[]; fixes: RankedFix[] };
}

const STATUS_KINDS = [
  { kind: "lift_out_of_order", icon: "🛗" },
  { kind: "ramp_blocked", icon: "🚧" },
  { kind: "toilet_closed", icon: "🚻" },
] as const;
const DURATIONS = [2, 12, 72, 168] as const;
const PROFILES: ProfileId[] = ["wheelchair", "crutches", "low_stamina"];
const ANSWERS: Answer[] = ["yes", "no", "not_sure", "na"];
const TABS = ["checklist", "docs", "reports", "insights"] as const;
type Tab = (typeof TABS)[number];
const when = (iso: string, lang: string) => new Date(iso).toLocaleString(lang === "ml" ? "ml-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default function HostVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useSettings();
  const { session, loading } = useRequireSession();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("checklist");
  const load = useCallback(() => hostFetch<Data>(`/api/host/venues/${id}`).then(setData).catch((e) => setError(e.message)), [id]);
  useEffect(() => { if (session) load(); }, [session, load]);

  if (!hostConfigured) return <Card><p>{t("not_configured")}</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (!session) return null;
  if (error) return <Card><p className="text-red-700">{error}</p><Link href="/host" className="mt-3 inline-block font-semibold text-brand">← {t("h_back_host")}</Link></Card>;
  if (!data) return <p className="text-muted">…</p>;

  const published = data.claim?.status === "approved";
  const ro = data.readOnly;
  const answers = Object.fromEntries(data.answers.map((a) => [a.item_id, a]));
  const docSections = new Set(data.documents.filter((d) => d.valid).flatMap((d) => DOC_KINDS[d.kind]?.sections ?? d.sections));
  const tabLabel: Record<Tab, StringKey> = { checklist: "h_tab_checklist", docs: "h_tab_docs", reports: "h_tab_reports", insights: "h_tab_insights" };

  return (
    <div className="space-y-5">
      <Link href={ro ? "/admin" : "/host"} className="min-h-11 text-sm font-semibold text-brand">← {t(ro ? "h_back_admin" : "h_back_host")}</Link>
      {ro && <p className="rounded-xl bg-slate-100 p-4" role="status">{t("h_admin_ro")}</p>}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{data.venue.name}</h1>
        <p className="text-muted">{data.venue.address}</p>
      </div>
      {!published && !ro && (
        <p className="rounded-xl bg-amber-50 p-4 text-amber-900" role="status">
          {t("h_draft")}{data.claim?.admin_note && <> {t("h_admin_note")} {data.claim.admin_note}</>}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start">
        <div className="space-y-5 md:sticky md:top-24">
          <LiveStatus venueId={id} rows={data.status} onChange={load} readOnly={ro} />
          <Preview preview={data.preview} />
        </div>
        <div className="space-y-4">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
            {TABS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${tab === k ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>
                {t(tabLabel[k])}{k === "reports" && data.reports.some((r) => !r.host_reply) ? " •" : ""}
              </button>
            ))}
          </div>
          {tab === "checklist" && (
            <>
              <h2 className="text-lg font-bold">{t("h_checklist")}</h2>
              <p className="text-sm text-muted">{t("h_checklist_d")}</p>
              {t("h_items_en") && <p className="text-sm text-muted">{t("h_items_en")}</p>}
              {data.sections.map((s) => (
                <Section key={s.id} venueId={id} section={s} score={data.scores.find((x) => x.id === s.id)!} answers={answers} photoUrls={data.photoUrls}
                  documented={docSections.has(s.id)} onSaved={load} readOnly={ro} />
              ))}
            </>
          )}
          {tab === "docs" && <Documents venueId={id} data={data} onSaved={load} readOnly={ro} />}
          {tab === "reports" && <Reports venueId={id} reports={data.reports} canReply={published && !ro} onSaved={load} />}
          {tab === "insights" && <Insights insights={data.insights} />}
        </div>
      </div>
    </div>
  );
}

function LiveStatus({ venueId, rows, onChange, readOnly }: { venueId: string; rows: StatusRow[]; onChange: () => void; readOnly: boolean }) {
  const { settings, t } = useSettings();
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
      <h2 className="text-lg font-bold">{t("h_now")}</h2>
      <p className="text-sm text-muted">{t("h_now_d")}</p>
      {!readOnly && <label className="mt-3 block text-sm font-medium">{t("h_for_how_long")}
        <select className="mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
          {DURATIONS.map((h) => <option key={h} value={h}>{t(`h_dur_${h}`)}</option>)}
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
                <span className="flex-1">{t(`h_st_${s.kind}`)}
                  {a && <span className="block text-xs font-normal">{fill(t("h_until_tap"), { d: when(a.until, settings.language) })}</span>}
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
  const { t } = useSettings();
  return (
    <Card>
      <h2 className="text-lg font-bold">{t("h_preview")}</h2>
      <p className="text-sm text-muted">{t("h_preview_d")}</p>
      <ul className="mt-3 space-y-3">
        {PROFILES.map((p) => {
          const r = preview[p];
          return (
            <li key={p} className={`rounded-xl border border-line border-l-8 p-3 ${VERDICT_STRIPE[r.verdict]}`}>
              <div className="flex flex-wrap items-center gap-2"><span className="mr-auto font-semibold">{t(`h_pf_${p}`)}</span><VerdictBadge verdict={r.verdict} size="sm" /></div>
              {r.reasons.slice(0, 3).map((x) => <p key={x} className="text-sm text-red-800">✕ {x}</p>)}
              {r.unconfirmed.length > 0 && <p className="text-sm text-amber-900">⚠ {t("unconfirmed")}: {r.unconfirmed.slice(0, 4).join(", ")}</p>}
              {r.flags.filter((f) => f.kind === "conflict").map((f) => <p key={f.detail} className="text-sm text-orange-800">⚑ {f.detail}</p>)}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Section({ venueId, section, score, answers, photoUrls, documented, onSaved, readOnly }: {
  venueId: string; section: ChecklistSection; score: { met: number; total: number; answered: number };
  answers: Record<string, AnswerRow>; photoUrls: Record<string, string>; documented: boolean; onSaved: () => void; readOnly: boolean;
}) {
  const { settings, t } = useSettings();
  return (
    <Card>
      <details className="group" open={score.answered < section.items.length}>
        <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2">
          <span className="mr-auto">
            <span className="block text-lg font-semibold">{settings.language === "ml" ? section.title_ml : section.title}</span>
            <span className="block text-xs text-muted">{section.guideline}{documented && " · 📄"}</span>
          </span>
          <span className="rounded-full bg-bg px-3 py-1 text-sm font-semibold">{fill(t("h_met"), { m: score.met, n: score.total })}</span>
          <span className="text-muted transition group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <ul className="mt-3 divide-y divide-line">
          {section.items.map((i) => <Item key={i.id} venueId={venueId} item={i} saved={answers[i.id]} photoUrl={photoUrls[i.id]} documented={documented} onSaved={onSaved} readOnly={readOnly} />)}
        </ul>
      </details>
    </Card>
  );
}

function AiNote({ check }: { check: AiCheck }) {
  const { t } = useSettings();
  const cls = check.verdict === "agrees" ? "bg-emerald-50 text-emerald-900" : check.verdict === "disagrees" ? "bg-orange-50 text-orange-900" : "bg-slate-100 text-slate-800";
  return (
    <p className={`mt-2 rounded-lg p-2 text-sm ${cls}`} role="status">
      {t(`h_ai_${check.verdict}`)}{check.verdict === "disagrees" && <span className="block text-xs">{check.detail}</span>}
    </p>
  );
}

function Item({ venueId, item, saved, photoUrl, documented, onSaved, readOnly }: {
  venueId: string; item: ChecklistItem; saved?: AnswerRow; photoUrl?: string; documented: boolean; onSaved: () => void; readOnly: boolean;
}) {
  const { t } = useSettings();
  const [answer, setAnswer] = useState<Answer | undefined>(saved?.answer);
  const [reason, setReason] = useState(saved?.reason ?? "");
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(Object.entries(saved?.values ?? {}).map(([k, v]) => [k, String(v)])));
  const [busy, setBusy] = useState<"save" | "photo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = answer !== saved?.answer || (reason || "") !== (saved?.reason ?? "") ||
    (item.inputs ?? []).some((inp) => (values[inp.key] ?? "") !== (saved?.values?.[inp.key] != null ? String(saved.values[inp.key]) : ""));

  const save = async () => {
    setBusy("save"); setError(null);
    try {
      await hostFetch(`/api/host/venues/${venueId}`, { method: "PUT", body: JSON.stringify({ item_id: item.id, answer, reason, values }) });
      onSaved();
    } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };
  const upload = async (file: File) => {
    setBusy("photo"); setError(null);
    const form = new FormData(); form.append("item_id", item.id); form.append("file", file);
    try { await hostFetch(`/api/host/venues/${venueId}`, { method: "POST", body: form }); onSaved(); } catch (e) { setError((e as Error).message); }
    setBusy(null);
  };

  return (
    <li className="py-4">
      <p className="font-medium">{item.text}</p>
      {item.target && <p className="text-sm">{t("h_requirement")} <strong>{item.target}</strong></p>}
      <p className="text-xs text-muted">{item.source}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={item.text}>
        {ANSWERS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={answer === a} disabled={readOnly} onClick={() => setAnswer(a)}
            className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${answer === a ? (a === "yes" ? "border-emerald-600 bg-emerald-50 text-emerald-900" : a === "no" ? "border-red-600 bg-red-50 text-red-900" : "border-brand bg-bg") : "border-line"}`}>
            {t(`h_a_${a}`)}
          </button>
        ))}
      </div>
      {answer === "na" && (
        <input aria-label={t("h_na_reason")} placeholder={t("h_na_reason")} value={reason} onChange={(e) => setReason(e.target.value)} disabled={readOnly}
          className="mt-2 min-h-11 w-full rounded-xl border border-line px-3" />
      )}
      {item.inputs && answer && answer !== "na" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.inputs.map((inp) => (
            <label key={inp.key} className="text-sm">{inp.label}
              <span className="mt-1 flex items-center gap-1">
                <input inputMode="decimal" value={values[inp.key] ?? ""} disabled={readOnly} onChange={(e) => setValues({ ...values, [inp.key]: e.target.value.replace(/[^\d.]/g, "") })}
                  className="min-h-11 w-28 rounded-xl border border-line px-3" />
                <span className="text-muted">{inp.unit}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {dirty && answer && !readOnly && <PrimaryButton type="button" onClick={save} disabled={!!busy}>{busy === "save" ? t("h_saving") : t("h_save")}</PrimaryButton>}
        {saved && !dirty && !readOnly && (
          <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 text-sm font-semibold ${busy ? "opacity-50" : ""}`}>
            📷 {busy === "photo" ? t("h_checking") : saved.photo_path ? t("h_replace_photo") : t("h_add_photo")}
            <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={!!busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        )}
        {saved && !dirty && <span className="text-sm text-emerald-800">{t(saved.photo_path ? "h_saved_photo" : documented ? "h_saved_doc" : "h_saved_self")}</span>}
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={item.text} className="h-16 w-16 rounded-lg object-cover" />
        )}
      </div>
      {saved?.photo_path && !dirty && saved.ai_check && <AiNote check={saved.ai_check} />}
      {error && <p className="mt-1 text-red-700" role="alert">{error}</p>}
    </li>
  );
}

function Documents({ venueId, data, onSaved, readOnly }: { venueId: string; data: Data; onSaved: () => void; readOnly: boolean }) {
  const { settings, t } = useSettings();
  const ml = settings.language === "ml";
  const [kind, setKind] = useState<DocKind>("access_audit");
  const [refNo, setRefNo] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const info = DOC_KINDS[kind];
  const title = (id: string) => { const s = data.sections.find((x) => x.id === id); return s ? (ml ? s.title_ml : s.title) : id; };

  const submit = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    const f = new FormData();
    f.append("kind", kind); f.append("ref_no", refNo); f.append("issued_by", issuer); f.append("issued_on", issued); f.append("expires_on", expires);
    f.append("sections", JSON.stringify(sections)); f.append("file", file);
    try {
      await hostFetch(`/api/host/venues/${venueId}/documents`, { method: "POST", body: f });
      setMsg({ ok: true, text: t("h_doc_sent") }); setFile(null); setRefNo(""); setIssuer(""); setIssued(""); setExpires(""); setSections([]); onSaved();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };

  const field = "mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3";
  const badge = (d: DocRow) => d.status === "approved" && !d.valid
    ? { text: t("h_doc_expired"), cls: "bg-slate-200 text-slate-800" }
    : { text: t(`h_doc_${d.status as "pending" | "approved" | "rejected"}`), cls: d.status === "approved" ? "bg-emerald-100 text-emerald-900" : d.status === "rejected" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900" };

  if (!data.documentsReady) return <Card><p>{t("h_doc_not_ready")}</p></Card>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("h_docs_d")}</p>
      {data.documents.length === 0 ? <p className="text-muted">{t("h_doc_none")}</p> : (
        <ul className="space-y-3">
          {data.documents.map((d) => {
            const b = badge(d);
            return (
              <li key={d.id}>
                <Card className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="mr-auto font-semibold">{ml ? DOC_KINDS[d.kind].label_ml : DOC_KINDS[d.kind].label}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>{b.text}</span>
                  </div>
                  <p className="text-sm text-muted">{[d.ref_no, d.issued_by, d.issued_on && `${t("h_doc_issued")} ${d.issued_on}`, d.expires_on && `${t("h_doc_expires")} ${d.expires_on}`].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm">{t("h_doc_covers")} {(DOC_KINDS[d.kind].sections ?? d.sections).map(title).join(", ")}</p>
                  {d.admin_note && <p className="rounded-xl bg-bg p-2 text-sm">{t("h_admin_says")} {d.admin_note}</p>}
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center font-semibold text-brand">{t("h_doc_open")}</a>}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {!readOnly && (
        <Card>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label className="block text-sm font-medium md:col-span-2">{t("h_doc_type")}
              <select className={field} value={kind} onChange={(e) => { setKind(e.target.value as DocKind); setSections([]); }}>
                {(Object.keys(DOC_KINDS) as DocKind[]).map((k) => <option key={k} value={k}>{ml ? DOC_KINDS[k].label_ml : DOC_KINDS[k].label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">{t("h_doc_ref")}<input className={field} value={refNo} onChange={(e) => setRefNo(e.target.value)} /></label>
            <label className="block text-sm font-medium">{t("h_doc_issuer")}<input className={field} value={issuer} onChange={(e) => setIssuer(e.target.value)} /></label>
            <label className="block text-sm font-medium">{t("h_doc_issued")}<input type="date" className={field} value={issued} onChange={(e) => setIssued(e.target.value)} /></label>
            <label className="block text-sm font-medium">{t("h_doc_expires")}{info.needsExpiry && " *"}
              <input type="date" required={info.needsExpiry} className={field} value={expires} onChange={(e) => setExpires(e.target.value)} />
            </label>
            {info.sections ? (
              <p className="text-sm md:col-span-2">{t("h_doc_covers")} {info.sections.map(title).join(", ")}</p>
            ) : (
              <fieldset className="md:col-span-2">
                <legend className="text-sm font-medium">{t("h_doc_sections")}</legend>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {data.sections.map((s) => (
                    <label key={s.id} className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={sections.includes(s.id)}
                        onChange={(e) => setSections(e.target.checked ? [...sections, s.id] : sections.filter((x) => x !== s.id))} />
                      {ml ? s.title_ml : s.title}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <label className="block text-sm font-medium md:col-span-2">{t("h_doc_file")}
              <input required type="file" accept="application/pdf,image/*" className={`${field} py-2`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <p className="text-xs text-muted md:col-span-2">{ml ? NOT_ACCEPTED_ML : NOT_ACCEPTED}</p>
            {msg && <p className={`md:col-span-2 ${msg.ok ? "text-emerald-800" : "text-red-700"}`} role="status">{msg.text}</p>}
            <PrimaryButton type="submit" className="md:col-span-2" disabled={busy || !file || (!info.sections && !sections.length) || (info.needsExpiry && !expires)}>
              {busy ? t("h_sending") : t("h_doc_send")}
            </PrimaryButton>
          </form>
        </Card>
      )}
    </div>
  );
}

function Reports({ venueId, reports, canReply, onSaved }: { venueId: string; reports: ReportRow[]; canReply: boolean; onSaved: () => void }) {
  const { settings, t } = useSettings();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("h_reports_d")}</p>
      {!canReply && <p className="text-sm text-muted">{t("h_reply_after")}</p>}
      {reports.length === 0 ? <p className="text-muted">{t("h_reports_none")}</p> : reports.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-auto font-semibold">{t(`feature_${r.feature}`)}</h3>
            <ConfidenceTag c={r.reading_confidence} />
          </div>
          <p className="text-xs text-muted">{when(r.created_at, settings.language)}</p>
          {r.reasons.length > 0 && <ul className="text-sm">{r.reasons.map((x) => <li key={x}>• {x}</li>)}</ul>}
          {r.note && <p className="text-sm text-muted">{r.note}</p>}
          {r.host_reply ? <p className="rounded-xl bg-bg p-3 text-sm">{t("h_replied")} {r.host_reply}</p>
            : canReply && !r.id.startsWith("mem-") && <ReplyForm venueId={venueId} reportId={r.id} onSaved={onSaved} />}
        </Card>
      ))}
    </div>
  );
}

function ReplyForm({ venueId, reportId, onSaved }: { venueId: string; reportId: string; onSaved: () => void }) {
  const { t } = useSettings();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = async () => {
    setBusy(true); setError(null);
    try { await hostFetch(`/api/host/venues/${venueId}/reports/${reportId}`, { method: "POST", body: JSON.stringify({ reply: text }) }); onSaved(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
      <label className="block text-sm font-medium">{t("h_your_reply")}
        <textarea rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
      </label>
      <PrimaryButton type="submit" disabled={busy || !text.trim()}>{busy ? t("h_sending") : t("h_reply_send")}</PrimaryButton>
      {error && <p className="text-red-700" role="alert">{error}</p>}
    </form>
  );
}

function Insights({ insights }: { insights: Data["insights"] }) {
  const { settings, t } = useSettings();
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">{t("h_ins_skips")}</h2>
        <p className="text-sm text-muted">{t("h_ins_skips_d")}</p>
        {insights.skips.length === 0 ? <p className="mt-2">{t("h_ins_none")}</p> : (
          <ul className="mt-3 space-y-2">
            {insights.skips.map((s) => (
              <li key={s.profile} className="rounded-xl bg-bg p-3">
                <p className="font-semibold">{t(`h_pf_${s.profile}`)}: {fill(t("h_ins_times"), { n: s.count })}</p>
                {s.top_reason && <p className="text-sm">{t("h_ins_top")} {s.top_reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="text-lg font-bold">{t("h_ins_fixes")}</h2>
        <p className="text-sm text-muted">{t("h_ins_fixes_d")}</p>
        {insights.fixes.length === 0 ? <p className="mt-2">{t("h_ins_nofix")}</p> : (
          <ol className="mt-3 space-y-3">
            {insights.fixes.map((f, i) => (
              <li key={f.fix} className="rounded-xl border border-line p-3">
                <p className="font-semibold">{i + 1}. {settings.language === "ml" ? f.fix_ml : f.fix}</p>
                <p className="text-sm">{t("h_ins_cost")} <strong>{f.cost}</strong></p>
                <p className="text-sm text-muted">{t("h_ins_helps")} {f.profiles.map((p) => t(`h_pf_${p}`)).join(", ")}{f.skips > 0 && ` · ${fill(t("h_ins_times"), { n: f.skips })}`}</p>
                <p className="text-xs text-muted">{t("h_ins_because")} {f.because}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
