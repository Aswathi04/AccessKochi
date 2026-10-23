// GET /api/venues?profile=wheelchair&lat=10.01&lng=76.34&radius=15&category=restaurant&companion=with_companion&show_excluded=1
import { NextRequest, NextResponse } from "next/server";
import { getVenuesLive } from "@/lib/host";
import { matchVenues } from "@/lib/matcher";
import type { Category, Companion, ProfileId } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const profile = (q.get("profile") ?? "wheelchair") as ProfileId;
  if (!["wheelchair", "crutches", "low_stamina"].includes(profile)) {
    return NextResponse.json({ error: "profile must be wheelchair | crutches | low_stamina" }, { status: 400 });
  }
  const lat = q.get("lat"), lng = q.get("lng");
  const results = matchVenues(await getVenuesLive(), {
    profile,
    companion: (q.get("companion") ?? "alone") as Companion,
    location: lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined,
    radius_km: q.get("radius") ? Number(q.get("radius")) : 15,
    categories: q.getAll("category") as Category[],
    include_excluded: q.get("show_excluded") === "1",
  });
  return NextResponse.json({ profile, count: results.length, results });
}
