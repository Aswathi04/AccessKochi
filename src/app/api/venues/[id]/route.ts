// GET /api/venues/v04?profile=wheelchair  -> venue record + verdict for that profile
import { NextRequest, NextResponse } from "next/server";
import { getVenue } from "@/lib/store";
import { evaluateVenue } from "@/lib/matcher";
import type { Companion, ProfileId } from "@/lib/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = getVenue(id);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });
  const profile = (req.nextUrl.searchParams.get("profile") ?? "wheelchair") as ProfileId;
  const companion = (req.nextUrl.searchParams.get("companion") ?? "alone") as Companion;
  return NextResponse.json({ venue, result: evaluateVenue(venue, profile, { companion }) });
}
