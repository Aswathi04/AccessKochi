"use client";
// Host home: sign in, see your claims, claim a venue.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HostSignIn } from "@/components/HostSignIn";
import { Card, PrimaryButton } from "@/components/ui";
import { venues } from "@/data/venues";
import { hostConfigured, hostFetch, useHostSession } from "@/lib/hostClient";
import { browserClient } from "@/lib/supabase";

interface Claim { id: string; venue_id: string; venue_name: string; role: string; status: string; dispute: boolean; admin_note: string | null }
interface Me { email: string; admin: boolean; claims: Claim[] }

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "Waiting for approval", cls: "bg-amber-100 text-amber-900" },
  approved: { text: "Approved", cls: "bg-emerald-100 text-emerald-900" },
  rejected: { text: "Rejected", cls: "bg-red-100 text-red-900" },
  more_info: { text: "More proof needed", cls: "bg-orange-100 text-orange-900" },
};

export default function HostHome() {
  const { session, loading } = useHostSession();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const load = useCallback(() => hostFetch<Me>("/api/host/me").then(setMe).catch((e) => setError(e.message)), []);
  useEffect(() => { if (session) load(); }, [session, load]);
  useEffect(() => { if (me?.admin) router.replace("/admin"); }, [me, router]);

  if (!hostConfigured) return <Card><p>The host dashboard isn&apos;t configured on this server yet (Supabase keys missing).</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (!session) return <HostSignIn />;
  if (!me || me.admin) return error ? <p className="text-red-700" role="alert">{error}</p> : <p className="text-muted">…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold md:text-3xl">Host dashboard</h1>
        <button type="button" onClick={() => browserClient().auth.signOut()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">Sign out</button>
      </div>
      <p className="text-muted">Signed in as {session.user.email}. What you enter shows to visitors as &ldquo;Host says…&rdquo;, next to what visitors report. It never replaces their reports.</p>
      {error && <p className="text-red-700" role="alert">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Your venues</h2>
        {me.claims.length === 0 ? <p className="text-muted">No venues yet. Claim one below.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {me.claims.map((c) => {
              const s = STATUS_LABEL[c.status];
              return (
                <li key={c.id}>
                  <Card className="h-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="mr-auto font-semibold">{c.venue_name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.text}</span>
                    </div>
                    <p className="text-sm text-muted">You: {c.role}{c.dispute && " · another host already manages this venue; an admin will review"}</p>
                    {c.admin_note && <p className="mt-2 rounded-xl bg-bg p-3 text-sm">Admin: {c.admin_note}</p>}
                    {c.status !== "rejected" && (
                      <Link href={`/host/${c.venue_id}`} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold text-brand-ink">
                        {c.status === "approved" ? "Manage venue" : "Fill in checklist (draft)"}
                      </Link>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ClaimForm onDone={load} taken={new Set(me.claims.filter((c) => c.status !== "rejected").map((c) => c.venue_id))} />
    </div>
  );
}

function ClaimForm({ onDone, taken }: { onDone: () => void; taken: Set<string> }) {
  const [venueId, setVenueId] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("owner");
  const [proofType, setProofType] = useState("trade_licence");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    const form = new FormData();
    form.append("venue_id", venueId); form.append("full_name", name); form.append("role", role);
    form.append("proof_type", proofType); form.append("proof_note", note); form.append("file", file);
    try {
      await hostFetch("/api/host/claims", { method: "POST", body: form });
      setMsg({ ok: true, text: "Claim sent. An admin will check your proof. You can start the checklist now as a draft." });
      setVenueId(""); setFile(null); setNote(""); onDone();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };

  const field = "mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3";
  return (
    <Card>
      <h2 className="text-lg font-bold">Claim a venue</h2>
      <p className="text-sm text-muted">Show you run this place. An admin checks the document before anything you enter is shown to visitors.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="block text-sm font-medium md:col-span-2">Venue
          <select required className={field} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">Choose…</option>
            {venues.filter((v) => !taken.has(v.id)).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.area}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">Your full name
          <input required className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="block text-sm font-medium">Your role
          <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Proof
          <select className={field} value={proofType} onChange={(e) => setProofType(e.target.value)}>
            <option value="trade_licence">Trade licence (panchayat/municipality)</option>
            <option value="gst">GST registration certificate</option>
            <option value="fssai">FSSAI licence (food venues)</option>
            <option value="video">Short video at the venue (signage, inside, a staff-only area)</option>
            <option value="other">Other official document</option>
          </select>
        </label>
        <label className="block text-sm font-medium">File (photo, PDF or video, max 50 MB)
          <input required type="file" accept="image/*,application/pdf,video/*" className={`${field} py-2`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-sm font-medium md:col-span-2">Note for the admin (optional)
          <textarea className={`${field} py-2`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="text-xs text-muted md:col-span-2">The name and address on the document must match the venue. Don&apos;t upload photos showing other people&apos;s faces.</p>
        {msg && <p className={`md:col-span-2 ${msg.ok ? "text-emerald-800" : "text-red-700"}`} role="status">{msg.text}</p>}
        <PrimaryButton type="submit" className="md:col-span-2" disabled={busy || !venueId || !name || !file}>{busy ? "Sending…" : "Send claim"}</PrimaryButton>
      </form>
    </Card>
  );
}
