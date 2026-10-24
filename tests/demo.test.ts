// The demo scenarios (docs/demo-script.md). Keyword parser only, so these run without an AI key.
import { describe, expect, it } from "vitest";
import { venues } from "@/data/venues";
import { runAgent, type Plan } from "@/lib/agent";
import type { ProfileId } from "@/lib/types";

const EDAPPALLY = { lat: 10.0261, lng: 76.3125 };
const ask = (text: string, context?: Plan["context"], profile: ProfileId = "wheelchair") =>
  runAgent({ text, profile, companion: "alone", language: "en", location: EDAPPALLY, venues, useLlm: false, context });

describe("hero: a movie near Edappally, then groceries", () => {
  it("lists theatres that work, skips the popular one with steps, and asks what else", async () => {
    const p = await ask("What theatres can I go to near Edappally?");
    expect(p.stops).toHaveLength(1);
    expect(p.stops[0]).toMatchObject({ name: "Edappally Cineplex", verdict: "pass" });
    expect(p.stops[0].alternatives.length).toBeGreaterThan(0);
    expect(p.stops[0].alternatives.every((a) => a.verdict !== "fail")).toBe(true);
    expect(p.rejected.map((r) => r.name)).toContain("Palarivattom Star Talkies");
    expect(p.follow_up).toMatch(/Anything else/);
  });
  it("'grocery shopping too' adds a grocery store close to the theatre", async () => {
    const first = await ask("What theatres can I go to near Edappally?");
    const p = await ask("Grocery shopping too", first.context);
    expect(p.stops.map((s) => s.name)).toEqual(["Edappally Cineplex", "Edappally Daily Supermarket"]);
    expect(p.stops.every((s) => s.verdict === "pass")).toBe(true);
    expect(p.stops[1].distance_from_prev_km!).toBeLessThan(0.5);
    expect(p.rejected.map((r) => r.name)).toContain("Edappally Corner Stores");
    expect(p.summary).toMatch(/Good news/);
  });
  it("works in Malayalam (no mosque from 'ഇടപ്പള്ളി')", async () => {
    const first = await ask("ഇടപ്പള്ളിയിൽ ഏതൊക്കെ തിയേറ്ററുകളിൽ പോകാം?");
    expect(first.stops.map((s) => s.name)).toEqual(["Edappally Cineplex"]);
    expect(first.language).toBe("ml");
    const p = await ask("പലചരക്ക് സാധനങ്ങളും വാങ്ങണം", first.context);
    expect(p.stops.map((s) => s.name)).toEqual(["Edappally Cineplex", "Edappally Daily Supermarket"]);
  });
});

describe("other demo queries", () => {
  it("hospital, lunch nearby, home by metro: every stop works", async () => {
    const p = await ask("Edappally to the General Hospital, lunch nearby, home by metro");
    expect(p.stops[0].name).toBe("Periyar General Hospital");
    expect(p.stops.every((s) => s.verdict === "pass")).toBe(true);
    expect(p.rejected.map((r) => r.name)).toContain("Kaloor Coffee House");
  });
  it("'which hall works for me' picks Vyttila Pearl and skips Kakkanad Grand", async () => {
    const p = await ask("Wedding reception, which hall works for me?");
    expect(p.stops[0]).toMatchObject({ name: "Vyttila Pearl Auditorium", verdict: "pass" });
    expect(p.rejected.map((r) => r.name)).toContain("Kakkanad Grand Convention Centre");
  });
  it("'then tea nearby' means a place to eat, not Edappally Tea & Snacks", async () => {
    const p = await ask("Doctor in Edappally, then tea nearby");
    expect(p.stops.map((s) => s.name)).not.toContain("Edappally Tea & Snacks");
  });
  it("Malayalam area names with endings are understood (കലൂരിൽ)", async () => {
    const p = await ask("കലൂരിൽ സിനിമ കാണണം");
    expect(p.stops[0].name).toBe("Kaloor Cinemas");
  });
  it("a named destination with problems stays, with a warning", async () => {
    const p = await ask("Wedding at the Kakkanad auditorium, then home by metro");
    expect(p.stops[0]).toMatchObject({ name: "Kakkanad Grand Convention Centre", verdict: "fail", must_go: true });
    expect(p.follow_up).toBeNull();
  });
});
