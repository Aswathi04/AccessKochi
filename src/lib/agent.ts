// The planning agent.
//   1. parse: request text -> constraints (stops). LLM first (Gemma on Neysa), keyword parser as fallback.
//   2. match: CODE picks venues with the rules matcher. The LLM never decides pass/fail.
//   3. plan:  structured plan built from matcher records only. Open stops ("a movie", "groceries") are
//             chosen together so the route is short; "what theatres can I go to" lists options.
//   Follow-ups ("grocery shopping too") add to the previous turn's stops (context).
//   4. explain: LLM writes a short summary from the plan JSON only (template fallback).

import { chatJson } from "./llm";
import { distanceKm, evaluateVenue, matchVenues } from "./matcher";
import type { Category, Companion, FeatureName, ProfileId, Venue, VenueResult } from "./types";

export type Lang = "en" | "ml";

export interface StopRequest {
  venue_id: string | null; // a specific place the user named or must go to
  category: Category | null;
  area: string | null;
  label: string; // what the user said, e.g. "lunch nearby"
  open?: boolean; // the user asked for options: we pick the place, even for destination types
}

export interface Constraints {
  start_area: string | null;
  stops: StopRequest[];
  clarifying_question: string | null;
}

export interface PlanStop {
  stop: number;
  venue_id: string;
  name: string;
  category: Category;
  area: string;
  must_go: boolean;
  label: string;
  verdict: VenueResult["verdict"];
  reasons: string[];
  unconfirmed: string[];
  flags: VenueResult["flags"];
  call_ahead: string | null;
  distance_from_prev_km: number | null;
  data_origin: Venue["data_origin"];
  highlights: string[]; // things that pass, e.g. "lift verified 2026-10-12"
  alternatives: Alternative[]; // other places that work, when the user asked for options
}

export interface Alternative {
  venue_id: string;
  name: string;
  area: string;
  verdict: VenueResult["verdict"];
  reasons: string[];
  highlights: string[];
  distance_km: number | null;
}

export interface Rejected {
  venue_id: string;
  name: string;
  failed_feature: FeatureName | null;
  reason: string;
  for_stop: number;
}

export interface Plan {
  stops: PlanStop[];
  rejected: Rejected[];
  notes: string[];
  clarifying_question: string | null;
  follow_up: string | null; // "Anything else you'd like to do on this trip?"
  context: Constraints; // send back with the next message to continue this trip
  summary: string;
  parsed_by: string;
  summary_by: string;
  language: Lang;
}

// ---------------- vocabulary ----------------

export const AREAS: Record<string, string[]> = {
  Kakkanad: ["kakkanad", "kakanad", "കാക്കനാട"],
  Edappally: ["edappally", "edapally", "edappalli", "ഇടപ്പള്ളി"],
  Vyttila: ["vyttila", "vytilla", "വൈറ്റില"],
  Kaloor: ["kaloor", "kalur", "കലൂർ", "കലൂര"],
  "MG Road": ["mg road", "m.g. road", "m g road", "എംജി റോഡ"],
  Palarivattom: ["palarivattom", "പാലാരിവട്ട"],
  "Fort Kochi": ["fort kochi", "fortkochi", "ഫോർട്ട് കൊച്ചി"],
  Kadavanthra: ["kadavanthra", "kadavantra", "കടവന്ത്ര"],
  "Marine Drive": ["marine drive", "മറൈൻ ഡ്രൈവ"],
  Thrippunithura: ["thrippunithura", "tripunithura", "തൃപ്പൂണിത്തുറ"],
  "Ernakulam North": ["ernakulam north", "എറണാകുളം നോർത്ത"],
};

const CATEGORY_WORDS: [Category, string[]][] = [
  ["water_metro", ["water metro", "boat", "ferry", "ജലമെട്രോ", "വാട്ടർ മെട്രോ", "ബോട്ട്"]],
  ["metro", ["metro", "മെട്രോ"]],
  ["hospital", ["hospital", "clinic", "doctor", "ആശുപത്രി", "ഹോസ്പിറ്റൽ", "ക്ലിനിക്"]],
  ["auditorium", ["wedding", "auditorium", "convention", "marriage", "reception", "കല്യാണ", "വിവാഹ", "ഓഡിറ്റോറിയ", "കൺവെൻഷൻ"]],
  ["restaurant", ["lunch", "dinner", "breakfast", "food", "eat", "café", "cafe", "restaurant", "coffee", "tea", "biryani", "ഊണ്", "ഭക്ഷണ", "ചായ", "കാപ്പി", "കഫേ", "റെസ്റ്റോറന്റ്", "ബിരിയാണി"]],
  ["grocery", ["grocery shopping", "groceries", "grocery", "supermarket", "vegetables", "പലചരക്ക്", "സൂപ്പർമാർക്കറ്റ്", "സാധനങ്ങൾ"]],
  ["mall", ["mall", "shopping", "മാൾ", "ഷോപ്പിംഗ്"]],
  ["theatre", ["movie", "cinema", "film", "theatre", "theater", "സിനിമ", "തിയേറ്റ", "തിയറ്റ"]],
  ["government", ["village office", "akshaya", "civil station", "collectorate", "rto", "government office", "office", "അക്ഷയ", "വില്ലേജ്", "ഓഫീസ്", "കളക്ടറേറ്റ്"]],
  ["worship", ["temple", "church", "mosque", "masjid", "ക്ഷേത്ര", "അമ്പല", "പള്ളി", "മസ്ജിദ്"]],
  ["tourism", ["homestay", "home stay", "resort", "beach", "ഹോംസ്റ്റേ", "ബീച്ച്"]],
];

// Places people go TO (the place is fixed), vs places we pick for them.
const DESTINATION_TYPES: Category[] = ["auditorium", "hospital", "government", "worship", "theatre"];
const GENERIC_NAME_WORDS = new Set([
  "the", "of", "and", "&", "station", "metro", "centre", "center", "hospital", "clinic", "office", "complex",
  "hall", "auditorium", "mall", "temple", "church", "masjid", "juma", "café", "cafe", "kitchen", "point",
  "house", "road", "terminal", "water", "medical", "family", "heritage", "village", "district", "st.", "mary's",
  "kakkanad", "edappally", "vyttila", "kaloor", "mg", "palarivattom", "fort", "kochi", "kadavanthra", "marine",
  "drive", "thrippunithura", "ernakulam", "north", "cinemas", "fresh", "mart", "shopping", "arcade", "lake",
  "tea", "snacks", "coffee", "biryani", "spice", "walkway", "cineplex", "screens", "talkies", "supermarket", "stores", "daily",
]);

// "What theatres can I go to…", "Which hall works for me?": list options instead of one pick.
const OPTION_WORDS = /\b(what|which|any|suggest|recommend|options?|show me|where can i)\b|ഏത്|ഏതൊക്കെ|ഏതെല്ലാം|നിർദ്ദേശ/i;
export const wantsOptions = (text: string) => OPTION_WORDS.test(text);

export function detectLanguage(text: string, fallback: Lang): Lang {
  return /[ഀ-ൿ]/.test(text) ? "ml" : fallback;
}

function findAll(hay: string, needles: string[]): number[] {
  const out: number[] = [];
  for (const n of needles) {
    let i = hay.indexOf(n);
    while (i >= 0) {
      const before = i === 0 ? " " : hay[i - 1];
      // word-ish boundary for Latin words; Malayalam stems match anywhere
      if (!/[a-z]/.test(n[0]) || !/[a-z]/.test(before)) out.push(i);
      i = hay.indexOf(n, i + n.length);
    }
  }
  return out;
}

/** Keyword parser used when no LLM is available or its answer is unusable. */
export function heuristicParse(text: string, venues: Venue[]): Constraints {
  const t = ` ${text.toLowerCase()} `;
  let masked = t;

  // Named venues first (distinctive words like "Periyar", "General", "Grand")
  const named: { pos: number; venue: Venue }[] = [];
  for (const v of venues) {
    const words = v.name.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 2 && !GENERIC_NAME_WORDS.has(w));
    for (const w of words) {
      const pos = findAll(t, [w])[0];
      if (pos !== undefined) { named.push({ pos, venue: v }); break; }
    }
  }

  const areaHits: { pos: number; area: string }[] = [];
  for (const [area, aliases] of Object.entries(AREAS)) {
    for (const a of aliases) for (const pos of findAll(t, [a])) {
      areaHits.push({ pos, area });
      masked = masked.slice(0, pos) + " ".repeat(a.length) + masked.slice(pos + a.length);
    }
  }

  const catHits: { pos: number; category: Category; word: string }[] = [];
  for (const [category, words] of CATEGORY_WORDS) {
    for (const w of words) {
      for (const pos of findAll(masked, [w])) {
        catHits.push({ pos, category, word: w });
        masked = masked.slice(0, pos) + " ".repeat(w.length) + masked.slice(pos + w.length); // "water metro" isn't also "metro"
      }
    }
  }
  catHits.sort((a, b) => a.pos - b.pos);
  // one hit per category word cluster: drop hits within 25 chars of the same category
  const cats = catHits.filter((h, i) => !catHits.slice(0, i).some((p) => p.category === h.category && h.pos - p.pos < 25));

  // Start area: "<area> to ..." or "from <area>"
  let start_area: string | null = null;
  for (const a of areaHits) {
    const after = t.slice(a.pos, a.pos + 40);
    const before = t.slice(Math.max(0, a.pos - 6), a.pos);
    if (/^\S+(\s\S+)?\s+to\s/.test(after) || /from\s$/.test(before)) { start_area = a.area; break; }
  }

  const stops: StopRequest[] = [];
  const usedNamed = new Set<string>();
  for (const c of cats) {
    // a named venue of this category mentioned near this word?
    const n = named.find((x) => x.venue.category === c.category && Math.abs(x.pos - c.pos) < 40 && !usedNamed.has(x.venue.id));
    if (n) usedNamed.add(n.venue.id);
    const nearArea = areaHits
      .filter((a) => a.area !== start_area || areaHits.filter((b) => b.area === a.area).length > 1)
      .map((a) => ({ ...a, d: Math.abs(a.pos - c.pos) }))
      .filter((a) => a.d < 30)
      .sort((x, y) => x.d - y.d)[0];
    // ~12 chars either side, widened to whole words
    const end = t.indexOf(" ", c.pos + c.word.length + 12);
    const label = t.slice(t.lastIndexOf(" ", Math.max(0, c.pos - 12)) + 1, end < 0 ? t.length : end).trim();
    stops.push({ venue_id: n?.venue.id ?? null, category: c.category, area: nearArea?.area ?? null, label });
  }
  // named venues whose category word wasn't said ("Periyar")
  for (const n of named) if (!usedNamed.has(n.venue.id) && !stops.some((s) => s.venue_id === n.venue.id)) {
    stops.push({ venue_id: n.venue.id, category: n.venue.category, area: n.venue.area, label: n.venue.name });
  }

  return {
    start_area,
    stops,
    clarifying_question: stops.length ? null : "Where would you like to go? For example: \"General Hospital, then lunch nearby, home by metro.\"",
  };
}

// ---------------- LLM parse ----------------

async function llmParse(text: string, venues: Venue[]): Promise<Constraints | null> {
  const categories = CATEGORY_WORDS.map(([c]) => c).join(", ");
  const venueList = venues.map((v) => `${v.id}: ${v.name} (${v.category}, ${v.area})`).join("\n");
  const system = [
    "You turn a trip request for an accessibility trip planner in Kochi, Kerala into JSON. The request may be in English, Malayalam or mixed.",
    "Do NOT judge accessibility. Only extract the stops in order.",
    `Allowed categories: ${categories}.`,
    `Known areas: ${Object.keys(AREAS).join(", ")}. Use one of these exactly, or null.`,
    "If the user names or clearly means one of the known venues below, set venue_id to its id; otherwise venue_id is null.",
    "\"home by metro\" means a final metro stop. A wedding means an auditorium. Groceries (പലചരക്ക്, സാധനങ്ങൾ) means grocery.",
    "If the user asks which places of a type work, or what options there are, return a stop with that category (and area if said). Do not ask a question then.",
    "If the request has no places at all, return an empty stops list and a short clarifying_question in the user's language.",
    'Reply with ONE JSON object: {"start_area": string|null, "stops": [{"venue_id": string|null, "category": string|null, "area": string|null, "label": "short words from the request"}], "clarifying_question": string|null}',
    "Known venues:",
    venueList,
  ].join("\n");
  const r = await chatJson<Constraints>([{ role: "system", content: system }, { role: "user", content: text }], { maxTokens: 500, timeoutMs: 45_000 });
  if (!r || !Array.isArray(r.data.stops)) return null;

  const ids = new Set(venues.map((v) => v.id));
  const cats = new Set(CATEGORY_WORDS.map(([c]) => c));
  const areas = new Set(Object.keys(AREAS));
  const stops = r.data.stops
    .map((s) => ({
      venue_id: s.venue_id && ids.has(s.venue_id) ? s.venue_id : null,
      category: s.category && cats.has(s.category as Category) ? (s.category as Category) : null,
      area: s.area && areas.has(s.area) ? s.area : null,
      label: String(s.label ?? "").slice(0, 80),
    }))
    .filter((s) => s.venue_id || s.category);
  return {
    start_area: r.data.start_area && areas.has(r.data.start_area) ? r.data.start_area : null,
    stops,
    clarifying_question: stops.length ? null : (r.data.clarifying_question ? String(r.data.clarifying_question) : null),
  };
}

// ---------------- planning (code only) ----------------

function areaCentre(area: string, venues: Venue[]): { lat: number; lng: number } | null {
  const vs = venues.filter((v) => v.area === area);
  if (!vs.length) return null;
  return { lat: vs.reduce((s, v) => s + v.lat, 0) / vs.length, lng: vs.reduce((s, v) => s + v.lng, 0) / vs.length };
}

function highlightsFor(r: VenueResult): string[] {
  const out: string[] = [];
  for (const f of r.features) {
    if (f.verdict !== "pass") continue;
    const best = Object.values(f.tracks).filter(Boolean).sort((a, b) => (a!.updated_at < b!.updated_at ? 1 : -1))[0];
    if (f.feature === "entrance") out.push(best?.reasons[0] ?? "step-free entrance");
    if (f.feature === "lift") out.push(`lift working (confirmed ${best?.updated_at ?? "recently"})`);
    if (f.feature === "toilet") out.push("accessible toilet");
    if (f.feature === "ramp") out.push("ramp meets the slope rule");
  }
  return out.slice(0, 3);
}

function firstFailedFeature(r: VenueResult): FeatureName | null {
  return r.features.find((f) => f.level === "required" && f.verdict === "fail")?.feature ?? r.features.find((f) => f.verdict === "fail")?.feature ?? null;
}

function toAlternative(v: Venue, r: VenueResult, from: { lat: number; lng: number } | null): Alternative {
  return { venue_id: v.id, name: v.name, area: v.area, verdict: r.verdict, reasons: r.reasons, highlights: highlightsFor(r), distance_km: from ? Math.round(distanceKm(from, v) * 10) / 10 : null };
}

// A better verdict always wins; distance (km, within MAX_KM) only breaks ties.
const VERDICT_COST: Record<VenueResult["verdict"], number> = { pass: 0, partial: 100, unknown: 200, risky: 1000, fail: 1000 };
const CANDIDATES = 4; // per open stop; 4^4 = 256 combinations at most
const MAX_KM = 10;

export function buildPlan(
  c: Constraints, venues: Venue[], profile: ProfileId, companion: Companion,
  userLocation?: { lat: number; lng: number }, opts: { options?: boolean } = {},
): Omit<Plan, "summary" | "parsed_by" | "summary_by" | "language" | "follow_up" | "context"> {
  const rejected: Rejected[] = [];
  const notes: string[] = [];
  const start = (c.start_area && areaCentre(c.start_area, venues)) || userLocation || null;
  const byId = new Map(venues.map((v) => [v.id, v]));
  const evalOf = (v: Venue) => evaluateVenue(v, profile, { companion });

  // 1. Fixed stops: a named venue, or "the Kakkanad auditorium" (unless the user asked for options).
  const fixed: (Venue | null)[] = c.stops.map((s) => {
    if (s.venue_id) return byId.get(s.venue_id) ?? null;
    if (!opts.options && !s.open && s.category && s.area && DESTINATION_TYPES.includes(s.category)) {
      const centre = areaCentre(s.area, venues);
      const inArea = venues.filter((v) => v.category === s.category && v.area === s.area);
      if (inArea.length && centre) return inArea.sort((a, b) => distanceKm(centre, a) - distanceKm(centre, b))[0];
    }
    return null;
  });

  // 2. Candidates for open stops: places that work, near the area asked for (or the user).
  const anchorOf = (i: number) => (c.stops[i].area && areaCentre(c.stops[i].area!, venues)) || start;
  const ranked = c.stops.map((s, i) => {
    if (fixed[i] || !s.category) return [];
    const anchor = anchorOf(i);
    return matchVenues(venues, { profile, companion, categories: [s.category], location: anchor ?? undefined, include_excluded: true })
      .filter((r) => !fixed.some((f) => f?.id === r.venue_id));
  });
  const cands = ranked.map((rs) => rs.filter((r) => r.verdict !== "fail" && r.verdict !== "risky" && (r.distance_km ?? 0) <= MAX_KM).slice(0, CANDIDATES));

  // 3. Choose all open stops together: shortest trip from the start through every stop, in order.
  const open = c.stops.map((_, i) => i).filter((i) => !fixed[i] && cands[i].length);
  let best: { cost: number; pick: Record<number, VenueResult> } = { cost: Infinity, pick: {} };
  const walk = (k: number, pick: Record<number, VenueResult>) => {
    if (k === open.length) {
      let cost = 0, prev = start;
      c.stops.forEach((_, i) => {
        const v = fixed[i] ?? (pick[i] ? byId.get(pick[i].venue_id)! : null);
        if (!v) return;
        if (prev) cost += distanceKm(prev, v);
        if (pick[i]) cost += VERDICT_COST[pick[i].verdict];
        prev = v;
      });
      if (cost < best.cost) best = { cost, pick: { ...pick } };
      return;
    }
    const i = open[k];
    for (const r of cands[i]) {
      if (Object.values(pick).some((p) => p.venue_id === r.venue_id)) continue;
      walk(k + 1, { ...pick, [i]: r });
    }
  };
  walk(0, {});

  // 4. Build the stops, with skipped places (popular, or closer than our pick) and options.
  const stops: PlanStop[] = [];
  let prev = start;
  c.stops.forEach((s, i) => {
    const n = stops.length + 1;
    const picked = best.pick[i];
    const chosen = fixed[i] ?? (picked ? byId.get(picked.venue_id)! : undefined);
    if (!fixed[i] && s.category) {
      const anchor = anchorOf(i);
      const pickDist = chosen && anchor ? distanceKm(anchor, chosen) : Infinity;
      for (const r of ranked[i].filter((r) => r.verdict === "fail" || r.verdict === "risky")) {
        const v = byId.get(r.venue_id)!;
        if ((v.popular || (r.distance_km ?? Infinity) < pickDist) && rejected.filter((x) => x.for_stop === n).length < 2) {
          rejected.push({ venue_id: v.id, name: v.name, failed_feature: firstFailedFeature(r), reason: r.reasons[0] ?? r.verdict, for_stop: n });
        }
      }
      if (!chosen) notes.push(`No ${s.category.replace("_", " ")} that works for this profile was found for "${s.label}".`);
    }
    if (!chosen) return;
    const r = evalOf(chosen);
    const alternatives = opts.options && !fixed[i]
      ? cands[i].filter((x) => x.venue_id !== chosen.id).slice(0, 2).map((x) => toAlternative(byId.get(x.venue_id)!, x, prev))
      : [];
    stops.push({
      stop: n,
      venue_id: chosen.id,
      name: chosen.name,
      category: chosen.category,
      area: chosen.area,
      must_go: !!fixed[i],
      label: s.label,
      verdict: r.verdict,
      reasons: r.reasons,
      unconfirmed: r.unconfirmed,
      flags: r.flags,
      call_ahead: r.call_ahead,
      distance_from_prev_km: prev ? Math.round(distanceKm(prev, chosen) * 10) / 10 : null,
      data_origin: chosen.data_origin,
      highlights: highlightsFor(r),
      alternatives,
    });
    if (fixed[i] && (r.verdict === "fail" || r.verdict === "risky")) {
      notes.push(`${chosen.name} is your destination, so it stays in the plan. Check the problems listed before you go.`);
    }
    prev = { lat: chosen.lat, lng: chosen.lng };
  });

  if (stops.some((s) => s.data_origin === "dummy")) notes.push("Demo data: venues and accessibility details are dummy data.");
  notes.push("Distances are straight-line and approximate.");
  return { stops, rejected, notes, clarifying_question: stops.length ? null : c.clarifying_question };
}

// A follow-up ("grocery shopping too") adds its stops to the trip so far.
export function mergeContext(prev: Constraints | undefined, next: Constraints): Constraints {
  if (!prev?.stops?.length) return next;
  const same = (a: StopRequest, b: StopRequest) => (a.venue_id && a.venue_id === b.venue_id) || (!a.venue_id && !b.venue_id && a.category === b.category);
  const stops = [...prev.stops, ...next.stops.filter((n) => !prev.stops.some((p) => same(p, n)))];
  return { start_area: next.start_area ?? prev.start_area, stops, clarifying_question: stops.length ? null : next.clarifying_question };
}

// ---------------- explanation ----------------

const VERDICT_WORDS: Record<Lang, Record<VenueResult["verdict"], string>> = {
  en: { pass: "works for you", partial: "mostly works, with some issues", unknown: "not confirmed", risky: "risky", fail: "has problems" },
  ml: { pass: "നിങ്ങൾക്ക് അനുയോജ്യം", partial: "ചില പ്രശ്നങ്ങളോടെ അനുയോജ്യം", unknown: "സ്ഥിരീകരിച്ചിട്ടില്ല", risky: "അപകടസാധ്യത", fail: "പ്രശ്നങ്ങളുണ്ട്" },
};

type PlanFacts = Omit<Plan, "summary" | "parsed_by" | "summary_by" | "language" | "follow_up" | "context">;

export function templateSummary(p: PlanFacts, lang: Lang): string {
  if (!p.stops.length) return p.clarifying_question ?? (lang === "ml" ? "എവിടെ പോകണമെന്ന് പറയാമോ?" : "Where would you like to go?");
  const parts: string[] = [];
  if (p.stops.length > 1 && p.stops.every((s) => s.verdict === "pass")) {
    parts.push(lang === "ml" ? `നല്ല വാർത്ത: ${p.stops.length} സ്ഥലങ്ങളും നിങ്ങൾക്ക് അനുയോജ്യം.` : `Good news: all ${p.stops.length} stops work for you.`);
  }
  for (const s of p.stops) {
    const v = VERDICT_WORDS[lang][s.verdict];
    const why = s.reasons[0] ? (lang === "ml" ? ` (${s.reasons[0]})` : `: ${s.reasons[0]}`) : "";
    const near = s.stop > 1 && s.distance_from_prev_km != null ? (lang === "ml" ? `, മുമ്പത്തെ സ്ഥലത്തു നിന്ന് ഏകദേശം ${s.distance_from_prev_km} കി.മീ.` : `, about ${s.distance_from_prev_km} km from the last stop`) : "";
    parts.push(`${s.stop}. ${s.name}, ${v}${why}${near}.`);
    if (s.alternatives.length) {
      parts.push(lang === "ml"
        ? `മറ്റ് ഓപ്ഷനുകൾ: ${s.alternatives.map((a) => `${a.name} (${VERDICT_WORDS.ml[a.verdict]})`).join(", ")}.`
        : `Other options: ${s.alternatives.map((a) => `${a.name} (${VERDICT_WORDS.en[a.verdict]})`).join(", ")}.`);
    }
  }
  const unc = p.stops.filter((s) => s.unconfirmed.length);
  if (unc.length) {
    parts.push(lang === "ml"
      ? `സ്ഥിരീകരിക്കാത്തവ: ${unc.map((s) => `${s.name} (${s.unconfirmed.join(", ")})`).join("; ")}. പോകുന്നതിനു മുമ്പ് വിളിച്ച് ചോദിക്കുക.`
      : `Unconfirmed, call ahead: ${unc.map((s) => `${s.name} (${s.unconfirmed.join(", ")})`).join("; ")}.`);
  }
  if (p.rejected.length) {
    parts.push(lang === "ml"
      ? `ഒഴിവാക്കിയത്: ${p.rejected.map((r) => `${r.name} (${r.reason})`).join("; ")}.`
      : `Skipped: ${p.rejected.map((r) => `${r.name} (${r.reason})`).join("; ")}.`);
  }
  return parts.join(" ");
}

async function llmSummary(p: PlanFacts, lang: Lang, request: string): Promise<{ text: string; by: string } | null> {
  const facts = {
    stops: p.stops.map((s) => ({
      stop: s.stop, name: s.name, verdict: VERDICT_WORDS[lang][s.verdict], problems: s.reasons, unconfirmed: s.unconfirmed, works: s.highlights,
      flags: s.flags.map((f) => f.detail), must_go: s.must_go, km_from_previous: s.stop > 1 ? s.distance_from_prev_km : null,
      other_options: s.alternatives.map((a) => ({ name: a.name, verdict: VERDICT_WORDS[lang][a.verdict] })),
    })),
    rejected: p.rejected.map((r) => ({ name: r.name, reason: r.reason })),
  };
  const system = [
    "You explain an accessibility trip plan in 2-4 short sentences, in a warm, encouraging tone.",
    "Start with what works for the person. If there are other_options, name them. If stops are close (km_from_previous), say how close.",
    "Use ONLY the facts in the JSON. Do not add any place, feature or number that is not in it.",
    "Never say a place is \"fully accessible\". Describe each stop with its \"verdict\" text exactly as given.",
    "Mention every unconfirmed item as \"unconfirmed, call ahead\". Mention skipped places and why in one short sentence near the end.",
    "Only items in a stop's \"unconfirmed\" list are unconfirmed. Items in \"works\" are confirmed; never call them unconfirmed.",
    "If sources disagree (flags), say so without picking a side.",
    lang === "ml" ? "Write in simple Malayalam (Malayalam script) only; translate problems and features too. Keep place names in English." : "Write in simple English.",
    'Reply as JSON: {"summary": "..."}',
  ].join("\n");
  const r = await chatJson<{ summary: string }>(
    [{ role: "system", content: system }, { role: "user", content: `Request: ${request}\nPlan facts: ${JSON.stringify(facts)}` }],
    { maxTokens: 400, timeoutMs: 45_000 },
  );
  if (!r || typeof r.data.summary !== "string" || !r.data.summary.trim()) return null;
  if (/fully accessible|100%/i.test(r.data.summary)) return null; // guardrail: fall back to template
  return { text: r.data.summary.trim(), by: r.provider };
}

// ---------------- entry point ----------------

export async function runAgent(input: {
  text: string;
  profile: ProfileId;
  companion: Companion;
  language: Lang;
  location?: { lat: number; lng: number };
  venues: Venue[];
  useLlm?: boolean;
  context?: Constraints; // the previous turn's constraints, to continue the same trip
}): Promise<Plan> {
  const lang = detectLanguage(input.text, input.language);
  const useLlm = input.useLlm !== false;

  let constraints: Constraints | null = useLlm ? await llmParse(input.text, input.venues) : null;
  let parsedBy = constraints ? "llm" : "keywords";
  // No stops from the model (or no model): try the keyword parser; keep the model's question only if keywords find nothing.
  if (!constraints || !constraints.stops.length) {
    const k = heuristicParse(input.text, input.venues);
    if (k.stops.length || !constraints?.clarifying_question) { constraints = k; parsedBy = "keywords"; }
  }
  if (constraints.clarifying_question && lang === "ml" && parsedBy === "keywords") {
    constraints.clarifying_question = "എവിടെ പോകണം? ഉദാഹരണം: \"ജനറൽ ആശുപത്രി, പിന്നെ അടുത്ത് ഊണ്, മെട്രോയിൽ വീട്ടിലേക്ക്.\"";
  }

  // Asking for options marks those stops open, so a later turn can still move them closer to the next stop.
  const options = wantsOptions(input.text) && constraints.stops.length === 1 && !constraints.stops[0].venue_id;
  if (options) constraints.stops = constraints.stops.map((st) => ({ ...st, open: true }));
  const merged = mergeContext(input.context, constraints);

  const plan = buildPlan(merged, input.venues, input.profile, input.companion, input.location, { options: options && !input.context?.stops?.length });
  const s = useLlm && plan.stops.length ? await llmSummary(plan, lang, input.text) : null;
  const ask = plan.stops.length && (options || input.context?.stops?.length) ? true : false;
  return {
    ...plan,
    follow_up: ask ? (lang === "ml" ? "ഈ യാത്രയിൽ മറ്റെന്തെങ്കിലും ചെയ്യാനുണ്ടോ?" : "Anything else you'd like to do on this trip?") : null,
    context: merged,
    summary: s?.text ?? templateSummary(plan, lang),
    parsed_by: parsedBy,
    summary_by: s?.by ?? "template",
    language: lang,
  };
}
