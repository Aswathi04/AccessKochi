// Host dashboard -> matcher. Checklist answers and live status from venues with an APPROVED claim
// become host-track evidence. They never touch visitor or audit tracks, so conflicts stay visible.
// Exception: sections covered by an approved access audit report become audit-track evidence.
import { ITEMS, SECTIONS, type Answer, type ChecklistSection } from "@/data/checklist";
import { DOC_KINDS, type DocKind } from "@/data/documents";
import { FIXES } from "@/data/fixes";
import { addedEvidence, getVenues } from "./store";
import { serverClient, supabaseConfigured } from "./supabase";
import type { Confidence, FeatureName, FeatureValue, Method, ProfileId, SourceType, Track, Venue, VenueResult } from "./types";

export interface AiCheck { verdict: "agrees" | "disagrees" | "unclear"; detail: string; at: string }
export interface AnswerRow { venue_id: string; item_id: string; answer: Answer; reason?: string | null; values: Record<string, number>; photo_path?: string | null; ai_check?: AiCheck | null; updated_at: string }
export interface StatusRow { venue_id: string; kind: "lift_out_of_order" | "ramp_blocked" | "toilet_closed"; until: string; note?: string | null; updated_at: string }
export interface DocRow { id?: string; venue_id: string; kind: DocKind; sections: string[]; status: "pending" | "approved" | "rejected"; expires_on: string | null; issued_by?: string | null }
export interface ReportRow {
  id: string; venue_id: string; feature: FeatureName; attributes: Record<string, unknown>; reading_confidence: Confidence;
  measurement_method: Method; source_type: SourceType; reasons: string[]; note: string | null; created_at: string;
  host_reply: string | null; host_reply_at: string | null;
}

// Dates shown to people are Kerala dates, not UTC.
export const istDate = (iso: string | Date) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// A document counts while approved and not past its expiry date (end of that day, IST).
export const docValid = (d: DocRow, now = new Date()) => d.status === "approved" && (!d.expires_on || istDate(now) <= d.expires_on);

const ITEM_SECTION: Record<string, string> = Object.fromEntries(SECTIONS.flatMap((s) => s.items.map((i) => [i.id, s.id])));

function coverage(docs: DocRow[], now: Date): Record<string, "audit" | "doc"> {
  const cov: Record<string, "audit" | "doc"> = {};
  for (const d of docs.filter((x) => docValid(x, now))) {
    const tier = DOC_KINDS[d.kind]?.tier;
    for (const s of DOC_KINDS[d.kind]?.sections ?? d.sections) if (tier === "audit" || !cov[s]) cov[s] = tier;
  }
  return cov;
}

export function answersToFeatures(rows: AnswerRow[], docs: DocRow[] = [], now = new Date()): FeatureValue[] {
  const cov = coverage(docs, now);
  type Acc = { attrs: Record<string, unknown>; latest: string; count: number; backed: number };
  const acc: Partial<Record<`${Track}:${FeatureName}`, Acc>> = {};
  for (const row of rows) {
    const item = ITEMS[row.item_id];
    if (!item) continue;
    const tier = cov[ITEM_SECTION[row.item_id]];
    const track: Track = tier === "audit" ? "audit" : "host";
    // A photo backs an answer unless the AI check says the photo shows otherwise.
    const backed = tier === "doc" || (!!row.photo_path && row.ai_check?.verdict !== "disagrees");
    const put = (f: FeatureName, k: string, v: unknown) => {
      const a = (acc[`${track}:${f}`] ??= { attrs: {}, latest: row.updated_at, count: 0, backed: 0 });
      a.attrs[k] = v;
      a.count++;
      if (backed) a.backed++;
      if (a.latest < row.updated_at) a.latest = row.updated_at;
    };
    const patch = row.answer === "yes" ? item.onYes : row.answer === "no" ? item.onNo : undefined;
    if (patch) for (const [k, v] of Object.entries(patch.attrs)) put(patch.feature, k, v);
    for (const inp of item.inputs ?? []) {
      const v = row.values?.[inp.key];
      if (typeof v === "number" && Number.isFinite(v)) put(inp.feature, inp.attr, v);
    }
  }
  return (Object.entries(acc) as [string, Acc][]).map(([key, a]) => {
    const [track, feature] = key.split(":") as [Track, FeatureName];
    if (track === "audit") {
      return { feature, track, attributes: a.attrs, reading_confidence: "high", measurement_method: "audit", source_type: "verified", updated_at: a.latest, note: "Access audit report on file, checked by an admin" };
    }
    const all = a.backed === a.count;
    return {
      feature, track, attributes: a.attrs,
      reading_confidence: all ? "medium" : "low",
      measurement_method: "self_reported", source_type: "unconfirmed", updated_at: a.latest,
      note: all ? "Host checklist, photos or documents on file" : "Host checklist, self-declared",
    };
  });
}

const STATUS_PATCH: Record<StatusRow["kind"], { feature: FeatureName; attrs: Record<string, unknown>; label: string }> = {
  lift_out_of_order: { feature: "lift", attrs: { present: true, working: false }, label: "Lift out of order" },
  ramp_blocked: { feature: "ramp", attrs: { present: true, blocked: true }, label: "Ramp blocked" },
  toilet_closed: { feature: "toilet", attrs: { accessible: false }, label: "Accessible toilet closed" },
};

export function statusToFeatures(rows: StatusRow[], now = new Date()): FeatureValue[] {
  return rows.filter((r) => new Date(r.until) > now).map((r) => {
    const s = STATUS_PATCH[r.kind];
    return {
      feature: s.feature, track: "host", attributes: { ...s.attrs, last_confirmed: istDate(r.updated_at) },
      reading_confidence: "high", measurement_method: "self_reported", source_type: "unconfirmed",
      updated_at: r.updated_at, // newer than checklist answers, so it wins within the host track
      note: `${s.label} (host, until ${new Date(r.until).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})${r.note ? `: ${r.note}` : ""}`,
    };
  });
}

export function reportToFeature(r: ReportRow): FeatureValue {
  return {
    feature: r.feature, track: "visitor", attributes: r.attributes, reading_confidence: r.reading_confidence,
    measurement_method: r.measurement_method, source_type: r.source_type, updated_at: istDate(r.created_at), note: r.note ?? undefined,
  };
}

// Section scores: "met" = answered yes; items marked "doesn't apply" are left out. Never one overall %.
export function sectionScores(sections: ChecklistSection[], answers: Record<string, Answer | undefined>) {
  return sections.map((s) => {
    const counted = s.items.filter((i) => answers[i.id] !== "na");
    return { id: s.id, met: counted.filter((i) => answers[i.id] === "yes").length, total: counted.length, answered: s.items.filter((i) => answers[i.id]).length };
  });
}

// Tables added after the first schema may not exist yet on an older database: treat as empty.
async function soft<T>(label: string, q: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await q;
  if (error) { console.warn(`[host] ${label}: ${error.message}`); return []; }
  return data ?? [];
}

interface Live { host: Record<string, FeatureValue[]>; visitor: Record<string, FeatureValue[]>; docs: Record<string, DocRow[]> }

async function loadLive(): Promise<Live> {
  const db = serverClient();
  const { data: claims, error } = await db.from("claims").select("venue_id").eq("status", "approved");
  if (error) throw error;
  const ids = [...new Set((claims ?? []).map((c) => c.venue_id as string))];
  const [answers, status, docs, reports] = await Promise.all([
    ids.length ? soft<AnswerRow>("answers", db.from("checklist_answers").select("*").in("venue_id", ids)) : [],
    ids.length ? soft<StatusRow>("status", db.from("live_status").select("*").in("venue_id", ids)) : [],
    ids.length ? soft<DocRow>("documents", db.from("documents").select("id, venue_id, kind, sections, status, expires_on, issued_by").eq("status", "approved").in("venue_id", ids)) : [],
    soft<ReportRow>("visitor_reports", db.from("visitor_reports").select("*").order("created_at", { ascending: false }).limit(2000)),
  ]);
  const by = <T extends { venue_id: string }>(xs: T[], id: string) => xs.filter((x) => x.venue_id === id);
  const out: Live = { host: {}, visitor: {}, docs: {} };
  for (const id of ids) {
    out.docs[id] = by(docs, id).filter((d) => docValid(d));
    out.host[id] = [...answersToFeatures(by(answers, id), out.docs[id]), ...statusToFeatures(by(status, id))];
  }
  for (const r of reports) (out.visitor[r.venue_id] ??= []).push(reportToFeature(r));
  return out;
}

// shortcut: 15 s in-process cache; fine for one server, use a shared cache if this ever scales out.
let cache: { at: number; data: Live } | null = null;
export function invalidateHostCache() { cache = null; }

export async function getVenuesLive(): Promise<Venue[]> {
  const seed = getVenues();
  if (!supabaseConfigured()) return seed;
  try {
    if (!cache || Date.now() - cache.at > 15_000) cache = { at: Date.now(), data: await loadLive() };
    const { host, visitor, docs } = cache.data;
    return seed.map((v) => {
      const extra = [...(host[v.id] ?? []), ...(visitor[v.id] ?? [])];
      const onFile = (docs[v.id] ?? []).map((d) => ({ kind: d.kind, label: DOC_KINDS[d.kind].label, expires_on: d.expires_on }));
      return extra.length || onFile.length ? { ...v, features: [...v.features, ...extra], documents_on_file: onFile } : v;
    });
  } catch (e) {
    console.warn("[host] falling back to seed data:", (e as Error).message);
    return seed;
  }
}

export async function getVenueLive(id: string): Promise<Venue | undefined> {
  return (await getVenuesLive()).find((v) => v.id === id);
}

// Visitor photo reports: Supabase when configured (so hosts can reply), else the in-memory store.
export async function saveVisitorReport(venueId: string, fv: FeatureValue, reasons: string[]): Promise<boolean> {
  if (!supabaseConfigured()) return false;
  const { error } = await serverClient().from("visitor_reports").insert({
    venue_id: venueId, feature: fv.feature, attributes: fv.attributes, reading_confidence: fv.reading_confidence,
    measurement_method: fv.measurement_method, source_type: fv.source_type, reasons, note: fv.note ?? null,
  });
  if (error) { console.warn("[host] visitor report not saved:", error.message); return false; }
  invalidateHostCache();
  return true;
}

export async function recentReports(venueId: string, limit = 10): Promise<ReportRow[]> {
  if (!supabaseConfigured()) {
    return addedEvidence(venueId).filter((f) => f.track === "visitor").slice(-limit).reverse().map((f, i) => ({
      id: `mem-${i}`, venue_id: venueId, feature: f.feature, attributes: f.attributes as Record<string, unknown>, reading_confidence: f.reading_confidence,
      measurement_method: f.measurement_method, source_type: f.source_type, reasons: [], note: f.note ?? null, created_at: f.updated_at, host_reply: null, host_reply_at: null,
    }));
  }
  return soft<ReportRow>("visitor_reports", serverClient().from("visitor_reports").select("*").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(limit));
}

// ---------------- insights ----------------

export interface SkipEvent { venue_id: string; profile: ProfileId; reason: string | null }

// A venue left out of a search or plan because it doesn't suit the person's profile.
export async function logSkips(events: SkipEvent[]) {
  if (!events.length || !supabaseConfigured()) return;
  const { error } = await serverClient().from("skip_events").insert(events);
  if (error) console.warn("[host] skips not logged:", error.message);
}

export interface RankedFix { fix: string; fix_ml: string; cost: string; rank: number; profiles: ProfileId[]; skips: number; because: string }

// Fixes for what currently fails or is partial per profile, most-skipped first, then cheapest.
export function rankFixes(preview: Record<ProfileId, VenueResult>, skips: Partial<Record<ProfileId, number>>): RankedFix[] {
  const out = new Map<string, RankedFix>();
  for (const [p, r] of Object.entries(preview) as [ProfileId, VenueResult][]) {
    for (const reason of r.reasons) {
      const f = FIXES.find((x) => x.match.test(reason));
      if (!f) continue;
      const cur = out.get(f.fix) ?? { fix: f.fix, fix_ml: f.fix_ml, cost: f.cost, profiles: [], skips: 0, because: reason, rank: f.rank };
      if (!cur.profiles.includes(p)) { cur.profiles.push(p); cur.skips += skips[p] ?? 0; }
      out.set(f.fix, cur);
    }
  }
  return [...out.values()].sort((a, b) => b.skips - a.skips || b.profiles.length - a.profiles.length || a.rank - b.rank);
}

export async function loadSkips(venueId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const rows = await soft<{ profile: ProfileId; reason: string | null }>("skip_events",
    serverClient().from("skip_events").select("profile, reason").eq("venue_id", venueId).gte("created_at", since).limit(5000));
  const by: Partial<Record<ProfileId, { count: number; reasons: Record<string, number> }>> = {};
  for (const r of rows) {
    const b = (by[r.profile] ??= { count: 0, reasons: {} });
    b.count++;
    if (r.reason) b.reasons[r.reason] = (b.reasons[r.reason] ?? 0) + 1;
  }
  return (Object.entries(by) as [ProfileId, { count: number; reasons: Record<string, number> }][]).map(([profile, b]) => ({
    profile, count: b.count, top_reason: Object.entries(b.reasons).sort((x, y) => y[1] - x[1])[0]?.[0] ?? null,
  }));
}

export const SECTION_IDS = SECTIONS.map((s) => s.id);

// AI check of a checklist photo: does what the model sees match what the host answered?
export function compareReading(expected: Record<string, unknown>, seen: Record<string, unknown>, visible: boolean): Omit<AiCheck, "at"> {
  if (!visible) return { verdict: "unclear", detail: "The photo doesn't clearly show this." };
  const diff: string[] = [];
  let same = 0;
  for (const [k, v] of Object.entries(expected)) {
    const s = seen[k];
    if (s == null) continue;
    if (s === v) same++; else diff.push(`${k.replace(/_/g, " ")}: photo seems to show ${String(s).replace(/_/g, " ")}`);
  }
  if (diff.length) return { verdict: "disagrees", detail: diff.join("; ") };
  return same ? { verdict: "agrees", detail: "The photo matches your answer." } : { verdict: "unclear", detail: "The photo can't confirm this item." };
}
