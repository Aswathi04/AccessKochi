"use client";
// Host home: sign in, see your claims, claim a venue.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, PrimaryButton } from "@/components/ui";
import { venues } from "@/data/venues";
import { hostConfigured, hostFetch, setUses, signOut, usesOf, useRequireSession } from "@/lib/hostClient";
import { fill } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";

interface Claim { id: string; venue_id: string; venue_name: string; role: string; status: string; dispute: boolean; admin_note: string | null }
interface Me { email: string; admin: boolean; claims: Claim[] }

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900", approved: "bg-emerald-100 text-emerald-900", rejected: "bg-red-100 text-red-900", more_info: "bg-orange-100 text-orange-900",
};
type ClaimStatus = "pending" | "approved" | "rejected" | "more_info";
type Role = "owner" | "manager" | "staff";

export default function HostHome() {
  const { session, loading } = useRequireSession();
  const { t } = useSettings();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const load = useCallback(() => hostFetch<Me>("/api/host/me").then(setMe).catch((e) => setError(e.message)), []);
  useEffect(() => { if (session) load(); }, [session, load]);
  useEffect(() => {
    if (!me) return;
    if (me.admin) { router.replace("/admin"); return; }
    const u = usesOf(session); // came here from the visitor app: remember this account also hosts
    if (u !== "host" && u !== "both") setUses(u === "visitor" ? "both" : "host");
  }, [me, router, session]);

  if (!hostConfigured) return <Card><p>{t("not_configured")}</p></Card>;
  if (loading) return <p className="text-muted">…</p>;
  if (!session) return null;
  if (!me || me.admin) return error ? <p className="text-red-700" role="alert">{error}</p> : <p className="text-muted">…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold md:text-3xl">{t("h_dash")}</h1>
        <button type="button" onClick={() => signOut(router)} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">{t("sign_out")}</button>
      </div>
      <p className="text-muted">{fill(t("h_signed_in"), { e: session.user.email ?? "" })}</p>
      {error && <p className="text-red-700" role="alert">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("h_your_venues")}</h2>
        {me.claims.length === 0 ? <p className="text-muted">{t("h_no_venues")}</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {me.claims.map((c) => {
              return (
                <li key={c.id}>
                  <Card className="h-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="mr-auto font-semibold">{c.venue_name}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLS[c.status]}`}>{t(`h_cs_${c.status as ClaimStatus}`)}</span>
                    </div>
                    <p className="text-sm text-muted">{t("h_you")} {t(`h_role_${c.role as Role}`)}{c.dispute && ` · ${t("h_dispute")}`}</p>
                    {c.admin_note && <p className="mt-2 rounded-xl bg-bg p-3 text-sm">{t("h_admin_says")} {c.admin_note}</p>}
                    {c.status !== "rejected" && (
                      <Link href={`/host/${c.venue_id}`} className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-brand font-semibold text-brand-ink">
                        {c.status === "approved" ? t("h_manage") : t("h_fill_draft")}
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
  const { t } = useSettings();
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
      setMsg({ ok: true, text: t("h_claim_sent") });
      setVenueId(""); setFile(null); setNote(""); onDone();
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };

  const field = "mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3";
  return (
    <Card>
      <h2 className="text-lg font-bold">{t("h_claim")}</h2>
      <p className="text-sm text-muted">{t("h_claim_d")}</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="block text-sm font-medium md:col-span-2">{t("h_venue")}
          <select required className={field} value={venueId} onChange={(e) => setVenueId(e.target.value)}>
            <option value="">{t("h_choose")}</option>
            {venues.filter((v) => !taken.has(v.id)).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.area}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">{t("h_full_name")}
          <input required className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label className="block text-sm font-medium">{t("h_your_role")}
          <select className={field} value={role} onChange={(e) => setRole(e.target.value)}>
            {(["owner", "manager", "staff"] as const).map((r) => <option key={r} value={r}>{t(`h_role_${r}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">{t("h_proof")}
          <select className={field} value={proofType} onChange={(e) => setProofType(e.target.value)}>
            {(["trade_licence", "gst", "fssai", "video", "other"] as const).map((k) => <option key={k} value={k}>{t(`h_pr_${k}`)}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium">{t("h_claim_file")}
          <input required type="file" accept="image/*,application/pdf,video/*" className={`${field} py-2`} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-sm font-medium md:col-span-2">{t("h_claim_note")}
          <textarea className={`${field} py-2`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="text-xs text-muted md:col-span-2">{t("h_claim_rule")}</p>
        {msg && <p className={`md:col-span-2 ${msg.ok ? "text-emerald-800" : "text-red-700"}`} role="status">{msg.text}</p>}
        <PrimaryButton type="submit" className="md:col-span-2" disabled={busy || !venueId || !name || !file}>{busy ? t("h_sending") : t("h_send_claim")}</PrimaryButton>
      </form>
    </Card>
  );
}
