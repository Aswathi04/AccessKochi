// POST /api/agent  { text, profile, companion, language, location?: {lat,lng} }
// Returns a structured plan. The UI renders the stops from the structured fields;
// the summary sentence is the only free text, and it's written from those fields.
import { NextRequest, NextResponse } from "next/server";
import { runAgent, type Lang } from "@/lib/agent";
import { getVenuesLive } from "@/lib/host";
import type { Companion, ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });
  const profile: ProfileId = ["wheelchair", "crutches", "low_stamina"].includes(body?.profile) ? body.profile : "wheelchair";
  const companion: Companion = body?.companion === "with_companion" ? "with_companion" : "alone";
  const language: Lang = body?.language === "ml" ? "ml" : "en";
  const loc = body?.location;
  const location = loc && typeof loc.lat === "number" && typeof loc.lng === "number" ? { lat: loc.lat, lng: loc.lng } : undefined;

  const plan = await runAgent({ text, profile, companion, language, location, venues: await getVenuesLive() });
  return NextResponse.json(plan);
}
