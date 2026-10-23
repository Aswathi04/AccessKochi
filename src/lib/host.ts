// Host dashboard -> matcher. Checklist answers and live status from venues with an APPROVED claim
// become host-track evidence. They never touch visitor or audit tracks, so conflicts stay visible.
import { ITEMS, SECTIONS, type Answer, type ChecklistSection } from "@/data/checklist";
import { getVenues } from "./store";
import { serverClient, supabaseConfigured } from "./supabase";
import type { FeatureName, FeatureValue, Venue } from "./types";

export interface AnswerRow { venue_id: string; item_id: string; answer: Answer; reason?: string | null; values: Record<string, number>; photo_path?: string | null; updated_at: string }
export interface StatusRow { venue_id: string; kind: "lift_out_of_order" | "ramp_blocked" | "toilet_closed"; until: string; note?: string | null; updated_at: string }

export function answersToFeatures(rows: AnswerRow[]): FeatureValue[] {
  const attrs: Partial<Record<FeatureName, Record<string, unknown>>> = {};
  const latest: Partial<Record<FeatureName, string>> = {};
  const photos: Partial<Record<FeatureName, number>> = {};
  const count: Partial<Record<FeatureName, number>> = {};
  const put = (f: FeatureName, k: string, v: unknown, row: AnswerRow) => {
    (attrs[f] ??= {})[k] = v;
    count[f] = (count[f] ?? 0) + 1;
    if (row.photo_path) photos[f] = (photos[f] ?? 0) + 1;
    if (!latest[f] || latest[f]! < row.updated_at) latest[f] = row.updated_at;
  };
  for (const row of rows) {
    const item = ITEMS[row.item_id];
    if (!item) continue;
    const patch = row.answer === "yes" ? item.onYes : row.answer === "no" ? item.onNo : undefined;
    if (patch) for (const [k, v] of Object.entries(patch.attrs)) put(patch.feature, k, v, row);
    for (const inp of item.inputs ?? []) {
      const v = row.values?.[inp.key];
      if (typeof v === "number" && Number.isFinite(v)) put(inp.feature, inp.attr, v, row);
    }
  }
  return (Object.keys(attrs) as FeatureName[]).map((feature) => ({
    feature,
    track: "host",
    attributes: attrs[feature]!,
    // shortcut: photos are stored but not AI-read yet; "medium" only when every answer for the feature has one
    reading_confidence: photos[feature] === count[feature] ? "medium" : "low",
    measurement_method: "self_reported",
    source_type: "unconfirmed",
    updated_at: latest[feature]!,
    note: photos[feature] === count[feature] ? "Host checklist, photos on file" : "Host checklist, self-declared",
  }));
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
      feature: s.feature, track: "host", attributes: { ...s.attrs, last_confirmed: r.updated_at.slice(0, 10) },
      reading_confidence: "high", measurement_method: "self_reported", source_type: "unconfirmed",
      updated_at: r.updated_at, // newer than checklist answers, so it wins within the host track
      note: `${s.label} (host, until ${new Date(r.until).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})${r.note ? `: ${r.note}` : ""}`,
    };
  });
}

// Section scores: "met" = answered yes; items marked "doesn't apply" are left out. Never one overall %.
export function sectionScores(sections: ChecklistSection[], answers: Record<string, Answer | undefined>) {
  return sections.map((s) => {
    const counted = s.items.filter((i) => answers[i.id] !== "na");
    return { id: s.id, met: counted.filter((i) => answers[i.id] === "yes").length, total: counted.length, answered: s.items.filter((i) => answers[i.id]).length };
  });
}

export async function loadHostEvidence(venueIds?: string[]): Promise<Record<string, FeatureValue[]>> {
  const db = serverClient();
  let approved = db.from("claims").select("venue_id").eq("status", "approved");
  if (venueIds) approved = approved.in("venue_id", venueIds);
  const { data: claims, error } = await approved;
  if (error) throw error;
  const ids = [...new Set((claims ?? []).map((c) => c.venue_id as string))];
  if (!ids.length) return {};
  const [{ data: answers, error: e1 }, { data: status, error: e2 }] = await Promise.all([
    db.from("checklist_answers").select("*").in("venue_id", ids),
    db.from("live_status").select("*").in("venue_id", ids),
  ]);
  if (e1 || e2) throw e1 ?? e2;
  const out: Record<string, FeatureValue[]> = {};
  for (const id of ids) {
    out[id] = [
      ...answersToFeatures((answers ?? []).filter((a) => a.venue_id === id) as AnswerRow[]),
      ...statusToFeatures((status ?? []).filter((s) => s.venue_id === id) as StatusRow[]),
    ];
  }
  return out;
}

// shortcut: 15 s in-process cache; fine for one server, use a shared cache if this ever scales out.
let cache: { at: number; data: Record<string, FeatureValue[]> } | null = null;
export function invalidateHostCache() { cache = null; }

export async function getVenuesLive(): Promise<Venue[]> {
  const seed = getVenues();
  if (!supabaseConfigured()) return seed;
  try {
    if (!cache || Date.now() - cache.at > 15_000) cache = { at: Date.now(), data: await loadHostEvidence() };
    const host = cache.data;
    return seed.map((v) => (host[v.id]?.length ? { ...v, features: [...v.features, ...host[v.id]] } : v));
  } catch (e) {
    console.warn("[host] falling back to seed data:", (e as Error).message);
    return seed;
  }
}

export async function getVenueLive(id: string): Promise<Venue | undefined> {
  return (await getVenuesLive()).find((v) => v.id === id);
}

export const SECTION_IDS = SECTIONS.map((s) => s.id);
