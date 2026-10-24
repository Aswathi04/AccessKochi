"use client";
// Admin queues: check each claim's proof and each document against the venue record, then decide.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { DOC_KINDS, type DocKind } from "@/data/documents";
import { SECTIONS } from "@/data/checklist";
import { hostConfigured, hostFetch, signOut, useRequireSession } from "@/lib/hostClient";
import type { StringKey } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

interface Claim {
  id: string; venue_id: string; email: string; full_name: string; role: string; proof_type: string; proof_note: string | null;
  proof_url: string | null; status: string; dispute: boolean; admin_note: string | null; decided_by: string | null; created_at: string;
  venue: { name: string; address: string; phone: string | null } | null;
}
interface Doc {
  id: string; venue_id: string; kind: DocKind; ref_no: string | null; issued_by: string | null; issued_on: string | null; expires_on: string | null;
  sections: string[]; status: string; admin_note: string | null; decided_by: string | null; created_at: string; file_url: string | null;
  venue: { name: string; address: string } | null;
}
type Queue = "claims" | "docs";
const TABS: Record<Queue, { id: string; key: StringKey }[]> = {
  claims: [{ id: "pending", key: "a_pending" }, { id: "more_info", key: "a_more_info" }, { id: "approved", key: "a_approved" }, { id: "rejected", key: "a_rejected" }, { id: "all", key: "a_all" }],
  docs: [{ id: "pending", key: "a_pending" }, { id: "approved", key: "a_approved" }, { id: "rejected", key: "a_rejected" }, { id: "all", key: "a_all" }],
};
const SECTION_TITLE = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default function AdminPage() {
  const { t } = useSettings();
  const { session, loading } = useRequireSession();
  const router = useRouter();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [queue, setQueue] = useState<Queue>("claims");
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState<Claim[] | Doc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setItems(null);
    const path = queue === "claims" ? `/api/admin/claims?status=${tab}` : `/api/admin/documents?status=${tab}`;
    hostFetch<{ claims?: Claim[]; documents?: Doc[] }>(path).then((d) => setItems(d.claims ?? d.documents ?? [])).catch((e) => setError(e.message));
  }, [queue, tab]);
  useEffect(() => { if (session) hostFetch<{ admin: boolean }>("/api/host/me").then((m) => setAdmin(m.admin)).catch((e) => setError(e.message)); }, [session]);
  useEffect(() => { if (admin === false) router.replace("/start"); else if (admin) load(); }, [admin, load, router]);

  if (!hostConfigured) return <Card><p>{t("not_configured")}</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (error) return <Card><p className="text-bad">{error}</p></Card>;
  if (!session || !admin) return null;

  const pill = (on: boolean) => `min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${on ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-medium md:text-3xl">{t("a_title")}</h1>
        <button type="button" onClick={() => signOut(router)} className="min-h-11 rounded-full border border-line px-4 text-sm font-medium">{t("sign_out")}</button>
      </div>
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(["claims", "docs"] as const).map((q) => (
          <button key={q} type="button" role="tab" aria-selected={queue === q} onClick={() => { setQueue(q); setTab("pending"); }}
            className={`min-h-12 rounded-xl border-2 font-medium ${queue === q ? "ui-chip border-brand bg-raise" : "border-line bg-card"}`}>{t(q === "claims" ? "a_claims" : "a_docs")}</button>
        ))}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
        {TABS[queue].map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={pill(tab === x.id)}>{t(x.key)}</button>
        ))}
      </div>
      {!items ? <p className="text-muted">…</p> : items.length === 0 ? <p className="text-muted">{t("a_nothing")}</p> : (
        <ul className="grid gap-4 md:grid-cols-2">
          {queue === "claims"
            ? (items as Claim[]).map((c) => <ClaimCard key={c.id} c={c} onDone={load} />)
            : (items as Doc[]).map((d) => <DocCard key={d.id} d={d} onDone={load} />)}
        </ul>
      )}
    </div>
  );
}

function useDecide(path: string, onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decide = async (decision: string, note: string) => {
    setBusy(true); setError(null);
    try { await hostFetch(path, { method: "POST", body: JSON.stringify({ decision, note }) }); onDone(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return { busy, error, decide };
}

function ClaimCard({ c, onDone }: { c: Claim; onDone: () => void }) {
  const { t } = useSettings();
  const [note, setNote] = useState(c.admin_note ?? "");
  const { busy, error, decide } = useDecide(`/api/admin/claims/${c.id}`, onDone);
  return (
    <li>
      <Card className="h-full space-y-3">
        <div>
          <h2 className="text-lg font-medium">{c.venue?.name ?? c.venue_id}</h2>
          <p className="text-sm text-muted">{c.venue?.address}{c.venue?.phone && ` · ${t("a_listed_phone")} ${c.venue.phone}`}</p>
        </div>
        {c.dispute && <p className="rounded-xl bg-flag-soft p-3 text-sm font-medium text-flag">{t("a_dispute")}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">{t("a_claimant")}</dt><dd>{c.full_name} ({c.role})</dd>
          <dt className="text-muted">{t("email")}</dt><dd className="break-all">{c.email}</dd>
          <dt className="text-muted">{t("h_proof")}</dt><dd>{t(`h_pr_${c.proof_type as "gst"}`)}</dd>
          <dt className="text-muted">{t("a_sent")}</dt><dd>{when(c.created_at)}</dd>
          {c.decided_by && <><dt className="text-muted">{t("a_decided_by")}</dt><dd>{c.decided_by}</dd></>}
        </dl>
        {c.proof_note && <p className="rounded-xl bg-deep p-3 text-sm">“{c.proof_note}”</p>}
        <Link href={`/host/${c.venue_id}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line font-medium text-brand">{t("a_view_checklist")}</Link>
        {c.proof_url && <a href={c.proof_url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-line font-medium text-brand">{t("a_open_proof")}</a>}
        <p className="text-xs text-muted">{t("a_check_claim")}</p>
        <label className="block text-sm font-medium">{t("a_note")}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <PrimaryButton type="button" disabled={busy} onClick={() => decide("approved", note)}>{t("a_approve")}</PrimaryButton>
          <button type="button" disabled={busy || !note.trim()} onClick={() => decide("more_info", note)} className="min-h-12 rounded-xl border border-line font-medium disabled:opacity-50">{t("a_more")}</button>
          <button type="button" disabled={busy || !note.trim()} onClick={() => decide("rejected", note)} className="min-h-12 rounded-xl border border-bad/60 font-medium text-bad disabled:opacity-50">{t("a_reject")}</button>
        </div>
        {error && <p className="text-bad" role="alert">{error}</p>}
      </Card>
    </li>
  );
}

function DocCard({ d, onDone }: { d: Doc; onDone: () => void }) {
  const { settings, t } = useSettings();
  const ml = settings.language === "ml";
  const [note, setNote] = useState(d.admin_note ?? "");
  const { busy, error, decide } = useDecide(`/api/admin/documents/${d.id}`, onDone);
  const info = DOC_KINDS[d.kind];
  const covers = (info?.sections ?? d.sections).map((s) => (ml ? SECTION_TITLE[s]?.title_ml : SECTION_TITLE[s]?.title) ?? s).join(", ");
  return (
    <li>
      <Card className="h-full space-y-3">
        <div>
          <h2 className="text-lg font-medium">{ml ? info?.label_ml : info?.label}</h2>
          <p className="text-sm text-muted">{d.venue?.name ?? d.venue_id} · {d.venue?.address}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {d.ref_no && <><dt className="text-muted">{t("h_doc_ref")}</dt><dd>{d.ref_no}</dd></>}
          {d.issued_by && <><dt className="text-muted">{t("h_doc_issuer")}</dt><dd>{d.issued_by}</dd></>}
          {d.issued_on && <><dt className="text-muted">{t("h_doc_issued")}</dt><dd>{d.issued_on}</dd></>}
          {d.expires_on && <><dt className="text-muted">{t("h_doc_expires")}</dt><dd>{d.expires_on}</dd></>}
          <dt className="text-muted">{t("h_doc_covers")}</dt><dd>{covers}</dd>
          <dt className="text-muted">{t("a_sent")}</dt><dd>{when(d.created_at)}</dd>
          {d.decided_by && <><dt className="text-muted">{t("a_decided_by")}</dt><dd>{d.decided_by}</dd></>}
        </dl>
        {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-line font-medium text-brand">{t("h_doc_open")}</a>}
        <Link href={`/host/${d.venue_id}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line font-medium text-brand">{t("a_view_checklist")}</Link>
        <p className="text-xs text-muted">{t("a_check")} {info?.check}</p>
        <label className="block text-sm font-medium">{t("a_note_doc")}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton type="button" disabled={busy} onClick={() => decide("approved", note)}>{t("a_approve")}</PrimaryButton>
          <button type="button" disabled={busy || !note.trim()} onClick={() => decide("rejected", note)} className="min-h-12 rounded-xl border border-bad/60 font-medium text-bad disabled:opacity-50">{t("a_reject")}</button>
        </div>
        {error && <p className="text-bad" role="alert">{error}</p>}
      </Card>
    </li>
  );
}
