import { describe, expect, it } from "vitest";
import { ITEMS, SECTIONS, sectionsFor } from "@/data/checklist";
import { venuesById } from "@/data/venues";
import { answersToFeatures, sectionScores, statusToFeatures, type AnswerRow } from "@/lib/host";
import { evaluateVenue } from "@/lib/matcher";

const row = (item_id: string, answer: AnswerRow["answer"], values: Record<string, number> = {}, photo_path: string | null = null): AnswerRow =>
  ({ venue_id: "v04", item_id, answer, values, photo_path, updated_at: "2026-10-24T10:00:00Z" });

describe("checklist data", () => {
  it("has unique item ids and a source on every item", () => {
    const ids = SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.values(ITEMS).every((i) => i.source.length > 0)).toBe(true);
  });
  it("shows the lift section only for venues with upper floors, and extras by venue type", () => {
    const flat = { category: "restaurant" as const, floors: 1, upper_floor_areas: [] };
    expect(sectionsFor(flat).some((s) => s.id === "lift")).toBe(false);
    expect(sectionsFor({ ...flat, floors: 2 }).some((s) => s.id === "lift")).toBe(true);
    const extras = sectionsFor(flat).find((s) => s.id === "extras")!.items.map((i) => i.id);
    expect(extras).toContain("X1");
    expect(extras).not.toContain("X3");
  });
});

describe("host answers -> matcher", () => {
  it("maps answers and measurements onto host-track attributes", () => {
    const fv = answersToFeatures([row("E1", "yes"), row("E3", "yes", { door_width_mm: 950 }), row("T1", "no")]);
    const entrance = fv.find((f) => f.feature === "entrance")!;
    expect(entrance.track).toBe("host");
    expect(entrance.attributes).toMatchObject({ step_count: 0, door_width_mm: 950 });
    expect(entrance.reading_confidence).toBe("low"); // no photos = self-declared
    expect(fv.find((f) => f.feature === "toilet")!.attributes).toMatchObject({ accessible: false });
  });
  it("raises confidence to medium only when every answer for the feature has a photo", () => {
    const some = answersToFeatures([row("E1", "yes", {}, "p.jpg"), row("E3", "yes", { door_width_mm: 950 })]);
    expect(some[0].reading_confidence).toBe("low");
    const all = answersToFeatures([row("E1", "yes", {}, "p.jpg"), row("E3", "yes", { door_width_mm: 950 }, "q.jpg")]);
    expect(all[0].reading_confidence).toBe("medium");
  });
  it("ignores not sure / doesn't apply and score-only items", () => {
    expect(answersToFeatures([row("T1", "not_sure"), row("R0", "na"), row("I4", "yes")])).toEqual([]);
  });
  it("host saying the ramp is fine does not hide a visitor conflict", () => {
    const v = venuesById["v02"]; // host says ramp fine, visitor tilt says 1:8
    const host = answersToFeatures([row("R0", "yes"), row("R1", "yes", { slope_ratio: 12 }), row("R5", "yes"), row("R7", "yes"), row("R8", "yes")]);
    const r = evaluateVenue({ ...v, features: [...v.features, ...host] }, "wheelchair");
    expect(r.flags.some((f) => f.kind === "conflict" && f.feature === "ramp")).toBe(true);
  });
});

describe("live status", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  it("an active 'lift out of order' makes a venue that needs the lift fail", () => {
    const v = venuesById["v01"]; // hospital with OP wards upstairs, lift working
    expect(evaluateVenue(v, "wheelchair").verdict).not.toBe("fail");
    const s = statusToFeatures([{ venue_id: "v01", kind: "lift_out_of_order", until: "2026-10-24T20:00:00Z", updated_at: "2026-10-24T11:00:00Z" }], now);
    const r = evaluateVenue({ ...v, features: [...v.features, ...s] }, "wheelchair");
    expect(r.verdict).toBe("fail");
    expect(r.reasons.join(" ")).toMatch(/lift not working/);
  });
  it("expired statuses are dropped", () => {
    expect(statusToFeatures([{ venue_id: "v01", kind: "ramp_blocked", until: "2026-10-24T11:59:00Z", updated_at: "2026-10-24T08:00:00Z" }], now)).toEqual([]);
  });
});

describe("section scores", () => {
  it("counts met items and leaves 'doesn't apply' out of the total", () => {
    const sections = SECTIONS.filter((s) => s.id === "handrails");
    expect(sectionScores(sections, { H1: "yes", H2: "na", H3: "no" })[0]).toEqual({ id: "handrails", met: 1, total: 2, answered: 3 });
  });
});
