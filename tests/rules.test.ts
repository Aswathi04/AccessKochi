import { describe, expect, it } from "vitest";
import { venuesById } from "@/data/venues";
import { answersToFeatures, compareReading, istDate, rankFixes, type AnswerRow, type DocRow } from "@/lib/host";
import { evaluateVenue, maxRunForSlope } from "@/lib/matcher";
import type { FeatureName, FeatureValue, Venue, VenueResult } from "@/lib/types";

const fv = (feature: FeatureName, attributes: Record<string, unknown>): FeatureValue =>
  ({ feature, track: "audit", attributes, reading_confidence: "high", measurement_method: "audit", source_type: "verified", updated_at: "2026-10-01" });
const venue = (features: FeatureValue[], upper = false): Venue =>
  ({ ...venuesById["v01"], features, upper_floor_areas: upper ? [{ name: "OP wards", floor: 1 }] : [] });
const feat = (v: Venue, f: FeatureName) => evaluateVenue(v, "wheelchair").features.find((x) => x.feature === f)!;
const okEntrance = fv("entrance", { step_count: 0, threshold_mm: 0, door_width_mm: 1000, door_type: "swing" });

describe("HG Table 3.4: ramp slope depends on run length", () => {
  const T: [number, number][] = [[12, 6], [14, 9], [15, 11], [20, 15], [25, 18]];
  it("looks up the longest allowed run", () => {
    expect(maxRunForSlope(12, T)).toBe(6);
    expect(maxRunForSlope(14, T)).toBe(9);
    expect(maxRunForSlope(16, T)).toBe(11);
    expect(maxRunForSlope(30, T)).toBe(18);
    expect(maxRunForSlope(10, T)).toBeNull();
  });
  const rampVenue = (slope: number, run?: number) => venue([
    fv("entrance", { step_count: 2, threshold_mm: 0, door_width_mm: 1000, door_type: "swing" }),
    fv("ramp", { present: true, slope_ratio: slope, run_m: run, width_mm: 1300, handrails: "both", surface: "firm", blocked: false }),
  ]);
  it("1:14 ramp passes up to 9 m and fails beyond", () => {
    expect(feat(rampVenue(14, 8), "ramp").verdict).toBe("pass");
    const r = feat(rampVenue(14, 10), "ramp");
    expect(r.verdict).toBe("fail");
    expect(r.tracks.audit!.reasons.join()).toMatch(/landing every 9 m/);
  });
  it("1:12 is fine for a 6 m run, not for 7 m; unknown run length does not fail", () => {
    expect(feat(rampVenue(12, 6), "ramp").verdict).toBe("pass");
    expect(feat(rampVenue(12, 7), "ramp").verdict).toBe("fail");
    expect(feat(rampVenue(12), "ramp").verdict).toBe("pass");
  });
});

describe("HG size vs Kerala legal minimum", () => {
  const toilet = (w: number, d: number) => venue([okEntrance,
    fv("toilet", { accessible: true, wc_type: "western", grab_bars: "both", transfer_space: true, door_mm: 900, door_swing: "outward", width_mm: w, depth_mm: d })]);
  it("toilet: HG size passes in either orientation; Kerala minimum is partial; smaller fails", () => {
    expect(feat(toilet(2200, 2000), "toilet").verdict).toBe("pass");
    expect(feat(toilet(2000, 2200), "toilet").verdict).toBe("pass");
    const legal = feat(toilet(1600, 1800), "toilet");
    expect(legal.verdict).toBe("partial");
    expect(legal.tracks.audit!.reasons.join()).toMatch(/Kerala minimum/);
    expect(feat(toilet(1400, 1700), "toilet").verdict).toBe("fail");
  });
  const lift = (w: number, d: number) => venue([okEntrance, fv("lift", { present: true, working: true, car_w_mm: w, car_d_mm: d, door_mm: 900 })], true);
  it("lift: 1500 x 1500 passes, KPBR 1100 x 2000 is partial, smaller fails", () => {
    expect(feat(lift(1500, 1500), "lift").verdict).toBe("pass");
    expect(feat(lift(1100, 2000), "lift").verdict).toBe("partial");
    expect(feat(lift(1000, 1400), "lift").verdict).toBe("fail");
  });
});

const row = (item_id: string, answer: AnswerRow["answer"], extra: Partial<AnswerRow> = {}): AnswerRow =>
  ({ venue_id: "v01", item_id, answer, values: {}, photo_path: null, updated_at: "2026-10-20T10:00:00Z", ...extra });
const doc = (kind: DocRow["kind"], extra: Partial<DocRow> = {}): DocRow => ({ venue_id: "v01", kind, sections: [], status: "approved", expires_on: null, ...extra });
const now = new Date("2026-10-24T12:00:00Z");
const liftRows = [row("L3", "yes", { values: { car_w_mm: 1600, car_d_mm: 1600 } }), row("L4", "yes", { values: { lift_door_mm: 900 } })];

describe("documents", () => {
  it("a valid lift licence backs lift answers (medium); expired or pending does not", () => {
    expect(answersToFeatures(liftRows, [doc("lift_licence", { expires_on: "2027-03-31" })], now)[0].reading_confidence).toBe("medium");
    expect(answersToFeatures(liftRows, [doc("lift_licence", { expires_on: "2026-10-23" })], now)[0].reading_confidence).toBe("low");
    expect(answersToFeatures(liftRows, [doc("lift_licence", { expires_on: "2027-03-31", status: "pending" })], now)[0].reading_confidence).toBe("low");
  });
  it("an access audit moves the sections it covers to the audit track", () => {
    const out = answersToFeatures([row("E1", "yes"), row("T1", "yes")], [doc("access_audit", { sections: ["entrance"] })], now);
    expect(out.find((f) => f.feature === "entrance")).toMatchObject({ track: "audit", reading_confidence: "high", source_type: "verified" });
    expect(out.find((f) => f.feature === "toilet")).toMatchObject({ track: "host", reading_confidence: "low" });
  });
  it("a document expiring today still counts today (IST)", () => {
    expect(answersToFeatures(liftRows, [doc("lift_licence", { expires_on: "2026-10-24" })], now)[0].reading_confidence).toBe("medium");
  });
});

describe("AI photo check", () => {
  it("compares what the photo shows with the answer", () => {
    expect(compareReading({ present: true }, { present: true }, true).verdict).toBe("agrees");
    expect(compareReading({ step_count: 0 }, { step_count: 3 }, true)).toMatchObject({ verdict: "disagrees" });
    expect(compareReading({ present: true }, { present: null }, true).verdict).toBe("unclear");
    expect(compareReading({ present: true }, { present: false }, false).verdict).toBe("unclear");
  });
  it("a photo the AI disagrees with does not back the answer", () => {
    const bad = { verdict: "disagrees" as const, detail: "", at: "" };
    expect(answersToFeatures([row("E1", "yes", { photo_path: "p.jpg", ai_check: bad })])[0].reading_confidence).toBe("low");
    expect(answersToFeatures([row("E1", "yes", { photo_path: "p.jpg" })])[0].reading_confidence).toBe("medium");
  });
});

describe("insights", () => {
  const res = (reasons: string[]) => ({ reasons } as VenueResult);
  it("ranks fixes by how often the affected profiles skipped the venue, then by cost", () => {
    const fixes = rankFixes(
      { wheelchair: res(["2 step(s) at the entrance, no ramp", "no grab bars in the toilet"]), crutches: res(["no grab bars in the toilet"]), low_stamina: res([]) },
      { wheelchair: 10, crutches: 1 },
    );
    expect(fixes[0].fix).toMatch(/grab bars/); // wheelchair + crutches = 11 skips
    expect(fixes[0].skips).toBe(11);
    expect(fixes[1].fix).toMatch(/Ramp beside the entrance/);
  });
});

it("dates are Kerala dates, not UTC", () => {
  expect(istDate("2026-10-23T20:00:00Z")).toBe("2026-10-24");
});
