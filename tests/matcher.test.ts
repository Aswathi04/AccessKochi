import { describe, expect, it } from "vitest";
import { venues, venuesById } from "@/data/venues";
import { evaluateVenue, matchVenues } from "@/lib/matcher";

const ev = (id: string, p: "wheelchair" | "crutches" | "low_stamina", companion?: "alone" | "with_companion") =>
  evaluateVenue(venuesById[id], p, { companion });

describe("seed data", () => {
  it("has 25-40 dummy venues", () => {
    expect(venues.length).toBeGreaterThanOrEqual(25);
    expect(venues.length).toBeLessThanOrEqual(40);
    expect(venues.every((v) => v.data_origin === "dummy")).toBe(true);
    expect(venues.every((v) => v.google_says.simulated)).toBe(true);
  });
  it("has unique ids", () => {
    expect(new Set(venues.map((v) => v.id)).size).toBe(venues.length);
  });
});

describe("test scenarios", () => {
  it("2: popular café with steps is excluded for wheelchair, with the reason", () => {
    const r = ev("v07", "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toMatch(/step\(s\) at the entrance, no ramp/);
    const listed = matchVenues(venues, { profile: "wheelchair", categories: ["restaurant"] });
    expect(listed.map((x) => x.venue_id)).not.toContain("v07");
    const all = matchVenues(venues, { profile: "wheelchair", categories: ["restaurant"], include_excluded: true });
    expect(all.map((x) => x.venue_id)).toContain("v07");
  });

  it("3: unknown restroom is flagged with a call-ahead number", () => {
    const r = ev("v03", "wheelchair");
    expect(r.verdict).toBe("unknown");
    expect(r.unconfirmed).toContain("accessible toilet");
    expect(r.call_ahead).toBeTruthy();
  });

  it("4: host vs visitor conflict raises a flag; tracks stay separate", () => {
    const r = ev("v02", "wheelchair");
    expect(r.flags.some((f) => f.kind === "conflict" && f.feature === "ramp")).toBe(true);
    const ramp = r.features.find((f) => f.feature === "ramp")!;
    expect(ramp.tracks.host?.verdict).toBe("pass");
    expect(ramp.tracks.visitor?.verdict).toBe("fail");
  });

  it("5: crutches + two low steps with handrail is Partial, not excluded", () => {
    expect(ev("v14", "crutches").verdict).toBe("partial");
    expect(ev("v14", "wheelchair").verdict).toBe("fail");
  });

  it("6: low stamina is flagged for a 400 m drop-off walk against 150 m", () => {
    const r = ev("v15", "low_stamina");
    expect(r.verdict).toBe("partial");
    expect(r.reasons.join(" ")).toMatch(/400 m .*limit 150 m/);
  });

  it("9: Google disagreement is flagged but does not change our verdict", () => {
    const r = ev("v28", "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.flags.some((f) => f.kind === "google_disagrees")).toBe(true);
  });

  it("12: one-step entrance is 'possible with help' only with a companion", () => {
    const alone = ev("v11", "wheelchair", "alone");
    const withC = ev("v11", "wheelchair", "with_companion");
    expect(alone.verdict).toBe("fail");
    expect(alone.flags.some((f) => f.kind === "possible_with_help")).toBe(false);
    expect(withC.verdict).not.toBe("fail");
    expect(withC.flags.some((f) => f.kind === "possible_with_help")).toBe(true);
  });

  it("13: wedding hall: dining hall upstairs with no lift, toilet unconfirmed", () => {
    const r = ev("v04", "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toMatch(/no lift to the Dining hall/);
    expect(r.unconfirmed).toContain("accessible toilet");
    // Entrance itself works via the ramp
    expect(r.features.find((f) => f.feature === "entrance")?.verdict).toBe("pass");
  });

  it("15: temple with steps is rejected for wheelchair, Partial for crutches", () => {
    expect(ev("v24", "wheelchair").verdict).toBe("fail");
    expect(ev("v24", "crutches").verdict).toBe("partial");
  });
});

describe("rules", () => {
  it("low-confidence evidence only raises a low_evidence flag", () => {
    const r = ev("v10", "wheelchair");
    expect(r.flags.some((f) => f.kind === "low_evidence")).toBe(true);
  });

  it("a broken lift reported recently fails the venue (and flags the conflict)", () => {
    const r = ev("v13", "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.flags.some((f) => f.kind === "conflict" && f.feature === "lift")).toBe(true);
  });

  it("raised doorstep (padi) over 12 mm fails for wheelchair", () => {
    const r = ev("v25", "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toMatch(/raised doorstep about 75 mm/);
  });

  it("blocked ramp fails for wheelchair", () => {
    expect(ev("v21", "wheelchair").reasons.join(" ")).toMatch(/ramp blocked or locked/);
  });

  it("fully accessible reference venues pass for every profile", () => {
    for (const id of ["v01", "v05", "v12", "v16", "v17", "v19"]) {
      for (const p of ["wheelchair", "crutches", "low_stamina"] as const) {
        expect(ev(id, p).verdict, `${id} ${p}`).toBe("pass");
      }
    }
  });

  it("ranks pass before partial before unknown, then by distance", () => {
    const order = { pass: 0, partial: 1, unknown: 2, risky: 3, fail: 4 };
    const list = matchVenues(venues, { profile: "wheelchair", location: { lat: 10.0159, lng: 76.3419 } });
    for (let i = 1; i < list.length; i++) {
      expect(order[list[i - 1].verdict]).toBeLessThanOrEqual(order[list[i].verdict]);
    }
  });
});
