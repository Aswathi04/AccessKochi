// Rules matcher: CODE decides pass/fail. The AI agent only explains these results.
// Rules:
//  - Host, visitor and audit tracks are evaluated separately and never averaged.
//  - A required feature that fails with medium+ confidence on ANY track fails the venue.
//  - A low-confidence fail makes the venue "risky", not excluded.
//  - Missing evidence is "unknown" -> "Unconfirmed, call ahead".
//  - Google's label is never scored; disagreement only raises a soft flag.

import profilesJson from "@/data/profiles.json";
import type {
  AttrMap, Companion, Confidence, FeatureName, FeatureResult, FeatureValue, Flag, Level,
  ProfileId, Track, TrackResult, Venue, VenueResult, VenueVerdict, Verdict,
} from "./types";

type Cfg = Record<string, unknown> & { level: Level };
type ProfileCfg = Record<FeatureName, Cfg> & { label: string; label_ml: string };
const profiles = profilesJson as unknown as Record<ProfileId, ProfileCfg>;

export function getProfile(id: ProfileId): ProfileCfg {
  return profiles[id];
}

const CONF_RANK: Record<Confidence, number> = { cant_tell: 0, low: 1, medium: 2, high: 3 };
const VERDICT_RANK: Record<Verdict, number> = { pass: 0, partial: 1, unknown: 2, fail: 3 };
const worst = (vs: Verdict[]): Verdict =>
  vs.reduce<Verdict>((a, b) => (VERDICT_RANK[b] > VERDICT_RANK[a] ? b : a), "pass");

interface EvalOut { verdict: Verdict; reasons: string[]; unconfirmed: string[]; help?: boolean }
interface Ctx { profile: ProfileId; companion: Companion; rampPresent: boolean | null; liftAreas: string }

const FEATURE_LABEL: Record<FeatureName, string> = {
  entrance: "entrance", ramp: "ramp", lift: "lift", toilet: "accessible toilet",
  dropoff_path: "path from the drop-off", parking: "accessible parking", seating: "seating",
};

const num = (v: unknown) => (typeof v === "number" ? v : null);

// ---------------- per-feature rules ----------------

function evalEntrance(a: Partial<AttrMap["entrance"]>, c: Cfg, ctx: Ctx): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  let help = false;

  const steps = a.step_count ?? null;
  if (steps === null) {
    out.push("unknown");
    unconfirmed.push("number of entrance steps");
  } else if (steps > 0) {
    const tolerated = num(c.steps_tolerated_with_handrail) ?? 0;
    const hasRail = a.handrail === "one" || a.handrail === "both";
    if (ctx.rampPresent === true) {
      out.push("pass");
      reasons.push(`${steps} step(s) at the entrance; step-free route via ramp`);
    } else if (hasRail && steps <= tolerated) {
      out.push("partial");
      reasons.push(`${steps} low step(s) with handrail at the entrance`);
    } else if (ctx.rampPresent === null) {
      out.push("unknown");
      reasons.push(`${steps} step(s) at the entrance`);
      unconfirmed.push("ramp at the entrance");
    } else if (ctx.profile === "wheelchair" && ctx.companion === "with_companion" && steps === 1) {
      out.push("partial");
      help = true;
      reasons.push("1 step at the entrance, no ramp: possible with help");
    } else {
      out.push("fail");
      reasons.push(`${steps} step(s) at the entrance, no ramp`);
    }
  } else {
    out.push("pass");
  }

  const maxT = num(c.max_threshold_mm);
  if (maxT !== null) {
    if (a.threshold_mm == null) unconfirmed.push("doorstep height");
    else if (a.threshold_mm > maxT) {
      out.push("fail");
      reasons.push(`raised doorstep about ${a.threshold_mm} mm (max ${maxT} mm)`);
    }
  }

  const minDoor = num(c.min_door_mm);
  if (minDoor !== null) {
    if (a.door_width_mm == null) unconfirmed.push("entrance door width");
    else if (a.door_width_mm < minDoor) {
      out.push("fail");
      reasons.push(`entrance door about ${a.door_width_mm} mm wide (min ${minDoor} mm)`);
    }
  }

  if ((a.door_type === "revolving" || a.door_type === "turnstile") && ctx.profile !== "low_stamina") {
    out.push("fail");
    reasons.push(`${a.door_type} door at the entrance`);
  }

  if (ctx.profile === "wheelchair" && a.footwear_area && a.wheelchair_route_beyond === false) {
    out.push("fail");
    reasons.push("no wheelchair route past the footwear area");
  }

  return { verdict: worst(out), reasons, unconfirmed, help };
}

function evalRamp(a: Partial<AttrMap["ramp"]>, c: Cfg): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  if (a.present === false) return { verdict: "fail", reasons: ["no ramp"], unconfirmed };
  if (a.present == null && a.blocked !== true) return { verdict: "unknown", reasons, unconfirmed: ["ramp at the entrance"] };

  const maxS = num(c.max_slope_ratio);
  if (maxS !== null) {
    if (a.slope_ratio == null) unconfirmed.push("ramp slope");
    else if (a.slope_ratio < maxS) {
      out.push("fail");
      reasons.push(`ramp about 1:${a.slope_ratio}, steeper than 1:${maxS}`);
    }
  }
  const minW = num(c.min_width_mm);
  if (minW !== null && a.width_mm != null && a.width_mm < minW) {
    out.push("fail");
    reasons.push(`ramp about ${a.width_mm} mm wide (min ${minW} mm)`);
  }
  if (c.handrails === "required") {
    if (a.handrails === "none") { out.push("fail"); reasons.push("ramp has no handrails"); }
    else if (a.handrails === "one") { out.push("partial"); reasons.push("ramp handrail on one side only"); }
    else if (a.handrails == null) unconfirmed.push("ramp handrails");
  } else if (c.handrails === "preferred" && a.handrails === "none") {
    out.push("partial"); reasons.push("ramp has no handrails");
  }
  if (a.surface === "slippery") { out.push("partial"); reasons.push("ramp surface slippery when wet"); }
  if (a.surface === "gravel") { out.push("partial"); reasons.push("loose surface on the ramp"); }
  if (a.blocked === true) { out.push("fail"); reasons.push("ramp blocked or locked"); }

  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed };
}

function evalLift(a: Partial<AttrMap["lift"]>, c: Cfg, ctx: Ctx): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  if (a.present === false) return { verdict: "fail", reasons: [`no lift to the ${ctx.liftAreas}`], unconfirmed };
  if (a.present == null) return { verdict: "unknown", reasons, unconfirmed: [`lift to the ${ctx.liftAreas}`] };
  if (a.working === false) {
    return { verdict: "fail", reasons: [`lift not working${a.last_confirmed ? ` (reported ${a.last_confirmed})` : ""}`], unconfirmed };
  }
  if (a.working == null) { out.push("unknown"); unconfirmed.push("whether the lift is working"); }

  const w = num(c.min_car_w_mm), d = num(c.min_car_d_mm), door = num(c.min_door_mm);
  if (w !== null && d !== null) {
    if (a.car_w_mm == null || a.car_d_mm == null) unconfirmed.push("lift size");
    else if (a.car_w_mm < w || a.car_d_mm < d) {
      out.push("fail"); reasons.push(`lift car about ${a.car_w_mm} x ${a.car_d_mm} mm (min ${w} x ${d} mm)`);
    }
  }
  if (door !== null && a.door_mm != null && a.door_mm < door) {
    out.push("fail"); reasons.push(`lift door about ${a.door_mm} mm (min ${door} mm)`);
  }
  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed };
}

function evalToilet(a: Partial<AttrMap["toilet"]>, c: Cfg): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  if (a.accessible === false) return { verdict: "fail", reasons: ["no accessible toilet"], unconfirmed };
  if (a.accessible == null) return { verdict: "unknown", reasons, unconfirmed: ["accessible toilet"] };

  if (c.wc_type === "western" && a.wc_type === "indian") { out.push("fail"); reasons.push("Indian-style WC only"); }
  if (c.grab_bars === "required") {
    if (a.grab_bars === "none") { out.push("fail"); reasons.push("no grab bars in the toilet"); }
    else if (a.grab_bars === "one_side") { out.push("partial"); reasons.push("grab bar on one side only"); }
    else if (a.grab_bars == null) unconfirmed.push("toilet grab bars");
  }
  if (c.transfer_space === "required") {
    if (a.transfer_space === false) { out.push("fail"); reasons.push("no space beside the WC to transfer"); }
    else if (a.transfer_space == null) unconfirmed.push("transfer space beside the WC");
  }
  const w = num(c.min_width_mm), d = num(c.min_depth_mm), door = num(c.min_door_mm);
  if (w !== null && d !== null && a.width_mm != null && a.depth_mm != null && (a.width_mm < w || a.depth_mm < d)) {
    out.push("fail"); reasons.push(`toilet about ${a.width_mm} x ${a.depth_mm} mm (min ${w} x ${d} mm)`);
  }
  if (door !== null && a.door_mm != null && a.door_mm < door) {
    out.push("fail"); reasons.push(`toilet door about ${a.door_mm} mm (min ${door} mm)`);
  }
  if (a.door_swing === "inward" && c.level === "required") { out.push("partial"); reasons.push("toilet door opens inward"); }
  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed };
}

function evalDropoff(a: Partial<AttrMap["dropoff_path"]>, c: Cfg, ctx: Ctx): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  if (a.step_free === false) {
    if (c.step_free === "required") { out.push("fail"); reasons.push("steps on the path from the drop-off"); }
    else if (c.step_free === "preferred") { out.push("partial"); reasons.push("steps on the path from the drop-off"); }
  } else if (a.step_free == null && c.step_free === "required") unconfirmed.push("step-free path from the drop-off");

  const maxD = num(c.max_distance_m);
  if (maxD !== null) {
    if (a.distance_m == null) unconfirmed.push("distance from the drop-off");
    else if (a.distance_m > maxD) {
      out.push("partial"); reasons.push(`${a.distance_m} m from the drop-off to the entrance (your limit ${maxD} m)`);
    }
  }
  if (ctx.profile !== "low_stamina" && (a.surface === "gravel" || a.surface === "broken" || a.surface === "mud")) {
    out.push("partial"); reasons.push(`${a.surface} surface on the approach`);
  }
  if (a.monsoon_risk === "high") { out.push("partial"); reasons.push("approach floods or gets slippery in the monsoon"); }
  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed };
}

function evalParking(a: Partial<AttrMap["parking"]>, c: Cfg): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  if (a.accessible_bay === false) { out.push("partial"); reasons.push("no accessible parking bay"); }
  const maxD = num(c.max_distance_m);
  if (maxD !== null && a.distance_m != null && a.distance_m > maxD) {
    out.push("partial"); reasons.push(`parking ${a.distance_m} m from the entrance (guideline ${maxD} m)`);
  }
  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed: [] };
}

function evalSeating(a: Partial<AttrMap["seating"]>, c: Cfg, ctx: Ctx): EvalOut {
  const out: Verdict[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  const maxR = num(c.max_rest_interval_m);
  if (maxR !== null) {
    if (a.rest_interval_m == null) unconfirmed.push("seating along the route");
    else if (a.rest_interval_m > maxR) {
      out.push("partial"); reasons.push(`seats about every ${a.rest_interval_m} m (guideline ${maxR} m)`);
    }
  }
  if (ctx.profile === "low_stamina" && a.queue_seating === false) { out.push("partial"); reasons.push("no seating in queues"); }
  if (ctx.profile !== "wheelchair" && a.armrests === false) { out.push("partial"); reasons.push("chairs without armrests"); }
  return { verdict: out.length ? worst(out) : "pass", reasons, unconfirmed };
}

// ---------------- combining ----------------

function evaluateValue(fv: FeatureValue, c: Cfg, ctx: Ctx): EvalOut {
  if (fv.reading_confidence === "cant_tell") return { verdict: "unknown", reasons: [], unconfirmed: [FEATURE_LABEL[fv.feature]] };
  const a = fv.attributes as never;
  switch (fv.feature) {
    case "entrance": return evalEntrance(a, c, ctx);
    case "ramp": return evalRamp(a, c);
    case "lift": return evalLift(a, c, ctx);
    case "toilet": return evalToilet(a, c);
    case "dropoff_path": return evalDropoff(a, c, ctx);
    case "parking": return evalParking(a, c);
    case "seating": return evalSeating(a, c, ctx);
  }
}

const isPassLike = (v: Verdict) => v === "pass" || v === "partial";

/** Which features apply to this venue for this profile, and at what level. */
function applicableFeatures(venue: Venue, prof: ProfileCfg): { feature: FeatureName; level: Level }[] {
  const list: { feature: FeatureName; level: Level }[] = [];
  const entranceSteps = venue.features
    .filter((f) => f.feature === "entrance")
    .map((f) => (f.attributes as Partial<AttrMap["entrance"]>).step_count ?? 0);
  const hasSteps = entranceSteps.some((s) => s > 0);
  // Ramp is judged only when a ramp exists (or might). "No ramp" is already handled by the entrance rule.
  const hasRampEvidence = venue.features.some(
    (f) => f.feature === "ramp" && (f.attributes as Partial<AttrMap["ramp"]>).present !== false,
  );
  const liftFrom = num(prof.lift.needed_from_floor) ?? 1;
  const needsLift = venue.upper_floor_areas.some((u) => u.floor >= liftFrom);

  for (const feature of ["entrance", "ramp", "lift", "toilet", "dropoff_path", "parking", "seating"] as FeatureName[]) {
    const level = prof[feature].level;
    if (level === "optional" && feature !== "ramp") continue;
    if (feature === "ramp" && !(hasSteps && hasRampEvidence)) continue; // ramp only matters if there are steps
    if (feature === "ramp" && level === "optional") continue;
    if (feature === "lift" && !needsLift) continue;
    // Toilets, parking and seating are only judged when there's evidence, except required ones.
    if ((feature === "parking" || feature === "seating") && !venue.features.some((f) => f.feature === feature)) continue;
    list.push({ feature, level });
  }
  return list;
}

function rampPresentFor(venue: Venue, track: Track): boolean | null {
  const same = venue.features.find((f) => f.feature === "ramp" && f.track === track);
  const any = same ?? venue.features.find((f) => f.feature === "ramp");
  if (!any) return null;
  const a = any.attributes as Partial<AttrMap["ramp"]>;
  if (a.present === false) return false;
  if (a.present === true || a.blocked != null) return true;
  return null;
}

export interface MatchOptions {
  companion?: Companion;
}

export function evaluateVenue(venue: Venue, profileId: ProfileId, opts: MatchOptions = {}): VenueResult {
  const prof = getProfile(profileId);
  const companion = opts.companion ?? "alone";
  const features: FeatureResult[] = [];
  const reasons: string[] = [];
  const unconfirmed: string[] = [];
  const flags: Flag[] = [];
  let anyHardFail = false, anyLowFail = false, anyRequiredUnknown = false, anyPartial = false;

  const liftFrom = num(prof.lift.needed_from_floor) ?? 1;
  const liftAreas = [...new Set(venue.upper_floor_areas.filter((u) => u.floor >= liftFrom).map((u) => `${u.name} (floor ${u.floor})`))].join(", ") || "upper floors";

  for (const { feature, level } of applicableFeatures(venue, prof)) {
    const cfg = prof[feature];
    const values = venue.features.filter((f) => f.feature === feature);
    const tracks: FeatureResult["tracks"] = {};

    if (values.length === 0) {
      features.push({ feature, level, verdict: "unknown", tracks, conflict: false });
      unconfirmed.push(feature === "lift" ? `lift to the ${liftAreas}` : FEATURE_LABEL[feature]);
      if (level === "required") anyRequiredUnknown = true;
      else anyPartial = true;
      continue;
    }

    let helpFlag = false;
    for (const fv of values) {
      const ctx: Ctx = { profile: profileId, companion, rampPresent: rampPresentFor(venue, fv.track), liftAreas };
      const r = evaluateValue(fv, cfg, ctx);
      if (r.help) helpFlag = true;
      const tr: TrackResult = {
        verdict: r.verdict, confidence: fv.reading_confidence, reasons: r.reasons, unconfirmed: r.unconfirmed,
        source_type: fv.source_type, updated_at: fv.updated_at,
      };
      // If a track has several records, keep the most recent one.
      const prev = tracks[fv.track];
      if (!prev || prev.updated_at <= fv.updated_at) tracks[fv.track] = tr;
    }

    const trs = Object.entries(tracks) as [Track, TrackResult][];
    const known = trs.filter(([, t]) => t.verdict !== "unknown");
    const fails = known.filter(([, t]) => t.verdict === "fail");
    const hardFail = fails.some(([, t]) => CONF_RANK[t.confidence] >= CONF_RANK.medium);
    const conflict = known.some(([, t]) => isPassLike(t.verdict)) && fails.length > 0 && known.length > 1;

    let verdict: Verdict;
    if (fails.length) verdict = "fail";
    else if (known.length) verdict = worst(known.map(([, t]) => t.verdict));
    else verdict = "unknown";

    features.push({ feature, level, verdict, tracks, conflict });

    const featReasons = [...new Set(trs.flatMap(([, t]) => t.reasons))];
    // Unconfirmed = details that NO track could confirm.
    const featUnconfirmed = trs.length
      ? trs[0][1].unconfirmed.filter((u) => trs.every(([, t]) => t.unconfirmed.includes(u)))
      : [];

    if (conflict) {
      const who = trs.map(([k, t]) => `${k} says ${t.verdict}`).join(", ");
      flags.push({ kind: "conflict", feature, detail: `Sources disagree on the ${FEATURE_LABEL[feature]}: ${who}` });
    }
    if (helpFlag) flags.push({ kind: "possible_with_help", feature, detail: "One step, no ramp: possible with help from your companion" });

    if (level === "required") {
      if (verdict === "fail") {
        if (hardFail) anyHardFail = true; else anyLowFail = true;
        reasons.push(...featReasons);
      } else if (verdict === "unknown") {
        anyRequiredUnknown = true;
        reasons.push(...featReasons);
      } else if (verdict === "partial") {
        anyPartial = true;
        reasons.push(...featReasons);
      }
    } else if (verdict !== "pass") {
      anyPartial = true;
      reasons.push(...featReasons);
    }
    unconfirmed.push(...featUnconfirmed);
  }

  let verdict: VenueVerdict;
  if (anyHardFail) verdict = "fail";
  else if (anyLowFail) verdict = "risky";
  else if (anyRequiredUnknown) verdict = "unknown";
  else if (anyPartial) verdict = "partial";
  else verdict = "pass";

  // Low evidence: passes, but only on low-confidence readings.
  if (verdict === "pass" || verdict === "partial") {
    const req = features.filter((f) => f.level === "required");
    const allLow = req.length > 0 && req.every((f) =>
      Object.values(f.tracks).every((t) => t && CONF_RANK[t.confidence] <= CONF_RANK.low));
    if (allLow) flags.push({ kind: "low_evidence", detail: "Based only on low-confidence visual estimates" });
  }

  // Google says: shown separately, never scored. Flag disagreement softly.
  const g = venue.google_says;
  const ent = features.find((f) => f.feature === "entrance");
  if (g.wheelchair_entrance === true && ent?.verdict === "fail") {
    flags.push({ kind: "google_disagrees", feature: "entrance", detail: "Google says the entrance is wheelchair accessible; our evidence says it is not" });
  }
  const toi = features.find((f) => f.feature === "toilet");
  if (g.wheelchair_restroom === true && toi?.verdict === "fail") {
    flags.push({ kind: "google_disagrees", feature: "toilet", detail: "Google says there is an accessible restroom; our evidence disagrees" });
  }

  const uniqUnconfirmed = [...new Set(unconfirmed)];
  return {
    venue_id: venue.id,
    name: venue.name,
    verdict,
    features,
    reasons: [...new Set(reasons)],
    unconfirmed: uniqUnconfirmed,
    flags,
    call_ahead: uniqUnconfirmed.length || verdict === "unknown" ? venue.phone : null,
  };
}

// ---------------- discovery / ranking ----------------

const ORDER: Record<VenueVerdict, number> = { pass: 0, partial: 1, unknown: 2, risky: 3, fail: 4 };

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface MatchQuery extends MatchOptions {
  profile: ProfileId;
  location?: { lat: number; lng: number };
  radius_km?: number;
  categories?: Venue["category"][];
  include_excluded?: boolean; // "show excluded" toggle
}

export function matchVenues(all: Venue[], q: MatchQuery): VenueResult[] {
  return all
    .filter((v) => !q.categories?.length || q.categories.includes(v.category))
    .map((v) => {
      const r = evaluateVenue(v, q.profile, q);
      if (q.location) r.distance_km = Math.round(distanceKm(q.location, v) * 10) / 10;
      return r;
    })
    .filter((r) => q.radius_km == null || r.distance_km == null || r.distance_km <= q.radius_km)
    .filter((r) => q.include_excluded || r.verdict !== "fail")
    .sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || (a.distance_km ?? 0) - (b.distance_km ?? 0));
}
