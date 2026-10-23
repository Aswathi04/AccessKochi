// Agent tests run WITHOUT an LLM (keyword parser + template summary), so they're deterministic.
import { describe, expect, it } from "vitest";
import { venues } from "@/data/venues";
import { detectLanguage, heuristicParse, runAgent } from "@/lib/agent";
import { extractJson } from "@/lib/llm";
import { sanitize } from "@/lib/vision";

const plan = (text: string, profile: "wheelchair" | "crutches" | "low_stamina" = "wheelchair", language: "en" | "ml" = "en") =>
  runAgent({ text, profile, companion: "alone", language, venues, useLlm: false });

describe("agent (no LLM)", () => {
  it("13: Kakkanad wedding then metro: hall kept as destination with problems, metro stop passes", async () => {
    const p = await plan("Wedding at the Kakkanad auditorium, then home by metro.");
    expect(p.stops.map((s) => s.venue_id)).toEqual(["v04", "v16"]);
    expect(p.stops[0].must_go).toBe(true);
    expect(p.stops[0].reasons.join(" ")).toMatch(/no lift to the Dining hall/);
    expect(p.stops[0].unconfirmed).toContain("accessible toilet");
    expect(p.stops[1].verdict).toBe("pass");
    expect(p.summary).toMatch(/call ahead/i);
  });

  it("14: the same request in Malayalam gives the same plan, summary in Malayalam", async () => {
    const p = await plan("കാക്കനാട് ഓഡിറ്റോറിയത്തിൽ കല്യാണം, പിന്നെ മെട്രോയിൽ വീട്ടിലേക്ക്");
    expect(p.language).toBe("ml");
    expect(p.stops.map((s) => s.venue_id)).toEqual(["v04", "v16"]);
    expect(p.summary).toMatch(/[ഀ-ൿ]/);
  });

  it("1: hospital, lunch, metro: plan with reasons and a rejected popular café", async () => {
    const p = await plan("Edappally to the General Hospital, lunch nearby, home by metro");
    expect(p.stops[0].venue_id).toBe("v01");
    expect(p.stops).toHaveLength(3);
    expect(p.stops[2].category).toBe("metro");
    expect(p.rejected.some((r) => r.venue_id === "v07")).toBe(true);
    // never picks a failing venue for a flexible stop
    expect(p.stops.slice(1).every((s) => s.verdict !== "fail")).toBe(true);
  });

  it("asks a clarifying question when there is no place in the request", async () => {
    const p = await plan("hello");
    expect(p.stops).toHaveLength(0);
    expect(p.clarifying_question).toBeTruthy();
  });

  it("10: summary never claims full accessibility", async () => {
    const p = await plan("is Periyar General Hospital fully wheelchair friendly?");
    expect(p.summary).not.toMatch(/fully accessible/i);
  });

  it("parses start area and named venues", () => {
    const c = heuristicParse("Edappally to the General Hospital", venues);
    expect(c.start_area).toBe("Edappally");
    expect(c.stops[0].venue_id).toBe("v01");
  });

  it("detects Malayalam", () => {
    expect(detectLanguage("മെട്രോ", "en")).toBe("ml");
    expect(detectLanguage("metro", "ml")).toBe("ml");
    expect(detectLanguage("metro", "en")).toBe("en");
  });
});

describe("LLM output handling", () => {
  it("extracts JSON from fenced or chatty replies", () => {
    expect(extractJson('Sure! ```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(extractJson('text {"a": {"b": "}"}} more')).toEqual({ a: { b: "}" } });
    expect(extractJson("no json")).toBeNull();
  });
});

describe("vision contract", () => {
  it("7: bad photo -> can't tell, no invented attributes", () => {
    const out = sanitize({ is_subject_visible: false, reading_confidence: "high", attributes: { slope_ratio: 12 } }, { feature: "ramp", reference: "none", tiltDeg: null });
    expect(out.reading_confidence).toBe("cant_tell");
    expect(out.attributes).toEqual({});
  });

  it("8: no reference caps at Low and drops numbers; A4 reference allows Medium", () => {
    const raw = { is_subject_visible: true, reading_confidence: "high" as const, attributes: { present: true, slope_ratio: 12, width_mm: 1200, handrails: "both" } };
    const noRef = sanitize(raw, { feature: "ramp", reference: "none", tiltDeg: null });
    expect(noRef.reading_confidence).toBe("low");
    expect(noRef.attributes.slope_ratio).toBeNull();
    expect(noRef.cant_tell_fields).toContain("slope_ratio");
    const a4 = sanitize(raw, { feature: "ramp", reference: "a4_sheet", tiltDeg: null });
    expect(a4.reading_confidence).toBe("medium");
    expect(a4.attributes.width_mm).toBe(1200);
  });

  it("phone tilt sets the slope and allows High", () => {
    const out = sanitize({ is_subject_visible: true, reading_confidence: "high", attributes: { present: true } }, { feature: "ramp", reference: "none", tiltDeg: 4.76 });
    expect(out.reading_confidence).toBe("high");
    expect(out.attributes.slope_ratio).toBeCloseTo(12, 0);
  });

  it("drops keys outside the schema", () => {
    const out = sanitize({ is_subject_visible: true, reading_confidence: "low", attributes: { present: true, verdict: "pass" } }, { feature: "ramp", reference: "none", tiltDeg: null });
    expect(out.attributes).not.toHaveProperty("verdict");
  });
});
