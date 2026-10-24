// POST /api/agent  { text, profile, companion, language, location?: {lat,lng}, context? }
// context = the previous reply's `context`, to continue the same trip ("grocery shopping too").
// Returns a structured plan. The UI renders the stops from the structured fields;
// the summary sentence is the only free text, and it's written from those fields.
import { NextRequest, NextResponse } from "next/server";
import { AREAS, runAgent, type Constraints, type Lang } from "@/lib/agent";
import { getVenuesLive, logSkips } from "@/lib/host";
import type { Companion, ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const CATEGORIES = new Set(["hospital", "auditorium", "restaurant", "mall", "grocery", "theatre", "metro", "water_metro", "government", "worship", "tourism"]);

// The context comes from the browser: keep only well-formed stops.
function cleanContext(raw: unknown, venueIds: Set<string>): Constraints | undefined {
  const c = raw as Partial<Constraints> | null;
  if (!c || !Array.isArray(c.stops)) return undefined;
  const area = (a: unknown) => (typeof a === "string" && a in AREAS ? a : null);
  const stops = c.stops.slice(0, 6).map((s) => ({
    venue_id: typeof s?.venue_id === "string" && venueIds.has(s.venue_id) ? s.venue_id : null,
    category: typeof s?.category === "string" && CATEGORIES.has(s.category) ? (s.category as Constraints["stops"][number]["category"]) : null,
    area: area(s?.area),
    label: String(s?.label ?? "").slice(0, 80),
    open: s?.open === true,
  })).filter((s) => s.venue_id || s.category);
  return { start_area: area(c.start_area), stops, clarifying_question: null };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const profile: ProfileId = ["wheelchair", "crutches", "low_stamina"].includes(body?.profile) ? body.profile : "wheelchair";
  const companion: Companion = body?.companion === "with_companion" ? "with_companion" : "alone";
  const language: Lang = body?.language === "ml" ? "ml" : "en";
  const loc = body?.location;
  const location = loc && typeof loc.lat === "number" && typeof loc.lng === "number" ? { lat: loc.lat, lng: loc.lng } : undefined;

  const venues = await getVenuesLive();
  const context = cleanContext(body?.context, new Set(venues.map((v) => v.id)));
  const plan = await runAgent({ text, profile, companion, language, location, venues, context });
  await logSkips(plan.rejected.map((r) => ({ venue_id: r.venue_id, profile, reason: r.reason })));
  return NextResponse.json(plan);
}
