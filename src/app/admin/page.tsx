"use client";
// Admin queue: check each claim's proof against the venue record, then approve, reject or ask for more.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HostSignIn } from "@/components/HostSignIn";
import { Card, PrimaryButton } from "@/components/ui";
import { hostConfigured, hostFetch, useHostSession } from "@/lib/hostClient";
import { browserClient } from "@/lib/supabase";

interface Claim {
  id: string; venue_id: string; email: string; full_name: string; role: string; proof_type: string; proof_note: string | null;
  proof_url: string | null; status: string; dispute: boolean; admin_note: string | null; decided_by: string | null; created_at: string;
  venue: { name: string; address: string; phone: string | null } | null;
}
const TABS = [{ id: "pending", label: "Pending" }, { id: "more_info", label: "More proof asked" }, { id: "approved", label: "Approved" }, { id: "rejected", label: "Rejected" }, { id: "all", label: "All" }];
const PROOF_LABEL: Record<string, string> = { trade_licence: "Trade licence", gst: "GST certificate", fssai: "FSSAI licence", video: "Video at venue", other: "Other document" };

export default function AdminPage() {
  const { session, loading } = useHostSession();
  const [tab, setTab] = useState("pending");
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setClaims(null);
    hostFetch<{ claims: Claim[] }>(`/api/admin/claims?status=${tab}`).then((d) => setClaims(d.claims)).catch((e) => setError(e.message));
  }, [tab]);
  useEffect(() => { if (session) load(); }, [session, load]);

  if (!hostConfigured) return <Card><p>Not configured on this server.</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (!session) return <HostSignIn />;
  if (error) return <Card><p className="text-red-700">{error}</p></Card>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold md:text-3xl">Venue claims</h1>
        <button type="button" onClick={() => browserClient().auth.signOut()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Sign out</button>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium ${tab === t.id ? "border-brand bg-brand text-brand-ink" : "border-line bg-card"}`}>{t.label}</button>
        ))}
      </div>
      {!claims ? <p className="text-muted">…</p> : claims.length === 0 ? <p className="text-muted">Nothing here.</p> : (
        <ul className="grid gap-4 md:grid-cols-2">{claims.map((c) => <ClaimCard key={c.id} c={c} onDone={load} />)}</ul>
      )}
    </div>
  );
}

function ClaimCard({ c, onDone }: { c: Claim; onDone: () => void }) {
  const [note, setNote] = useState(c.admin_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decide = async (decision: string) => {
    setBusy(true); setError(null);
    try { await hostFetch(`/api/admin/claims/${c.id}`, { method: "POST", body: JSON.stringify({ decision, note }) }); onDone(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  };
  return (
    <li>
      <Card className="h-full space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{c.venue?.name ?? c.venue_id}</h2>
          <p className="text-sm text-muted">{c.venue?.address}{c.venue?.phone && ` · listed phone ${c.venue.phone}`}</p>
        </div>
        {c.dispute && <p className="rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-900">⚑ Another approved host already manages this venue.</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted">Claimant</dt><dd>{c.full_name} ({c.role})</dd>
          <dt className="text-muted">Email</dt><dd className="break-all">{c.email}</dd>
          <dt className="text-muted">Proof</dt><dd>{PROOF_LABEL[c.proof_type] ?? c.proof_type}</dd>
          <dt className="text-muted">Sent</dt><dd>{new Date(c.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
          {c.decided_by && <><dt className="text-muted">Decided by</dt><dd>{c.decided_by}</dd></>}
        </dl>
        {c.proof_note && <p className="rounded-xl bg-bg p-3 text-sm">“{c.proof_note}”</p>}
        <Link href={`/host/${c.venue_id}`} className="flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold text-brand">View this venue&apos;s checklist (read-only)</Link>
        {c.proof_url && <a href={c.proof_url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center rounded-xl border border-line font-semibold text-brand">Open proof file ↗</a>}
        <p className="text-xs text-muted">Check: name and address on the document match the venue; the document is current; a video shows this place and a staff-only area.</p>
        <label className="block text-sm font-medium">Note to the host (required to reject or ask for more)
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded-xl border border-line px-3 py-2" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <PrimaryButton type="button" disabled={busy} onClick={() => decide("approved")}>Approve</PrimaryButton>
          <button type="button" disabled={busy || !note.trim()} onClick={() => decide("more_info")} className="min-h-12 rounded-xl border border-line font-semibold disabled:opacity-50">Ask for more</button>
          <button type="button" disabled={busy || !note.trim()} onClick={() => decide("rejected")} className="min-h-12 rounded-xl border border-red-300 font-semibold text-red-800 disabled:opacity-50">Reject</button>
        </div>
        {error && <p className="text-red-700" role="alert">{error}</p>}
      </Card>
    </li>
  );
}
