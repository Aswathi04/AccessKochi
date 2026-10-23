// POST /api/vision  (multipart form)
//   image: file (jpeg/png, resized in the browser to ~1024 px)
//   venue_id, feature (entrance|ramp|toilet|lift|dropoff_path), reference (none|a4_sheet|phone_upright|standard_door)
//   role (host|visitor), tilt_deg (optional), save ("1" to add to the venue's evidence)
import { NextRequest, NextResponse } from "next/server";
import { readPhoto, toFeatureValue, type Reference } from "@/lib/vision";
import { addEvidence, getVenue } from "@/lib/store";
import { evaluateVenue } from "@/lib/matcher";
import type { Companion, FeatureName, ProfileId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const FEATURES: FeatureName[] = ["entrance", "ramp", "toilet", "lift", "dropoff_path"];
const REFS: Reference[] = ["none", "a4_sheet", "phone_upright", "standard_door"];

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("image");
  const venueId = String(form.get("venue_id") ?? "");
  const feature = String(form.get("feature") ?? "") as FeatureName;
  const reference = (String(form.get("reference") ?? "none") as Reference);
  const role = String(form.get("role") ?? "visitor") === "host" ? "host" : "visitor";
  const tiltRaw = form.get("tilt_deg");
  const tiltDeg = tiltRaw ? Number(tiltRaw) : null;
  const profile = String(form.get("profile") ?? "wheelchair") as ProfileId;
  const companion = String(form.get("companion") ?? "alone") as Companion;

  if (!(file instanceof Blob)) return NextResponse.json({ error: "image file required" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "image too large (max 8 MB)" }, { status: 400 });
  if (!FEATURES.includes(feature)) return NextResponse.json({ error: `feature must be one of ${FEATURES.join(", ")}` }, { status: 400 });
  if (!REFS.includes(reference)) return NextResponse.json({ error: `reference must be one of ${REFS.join(", ")}` }, { status: 400 });
  const venue = getVenue(venueId);
  if (!venue) return NextResponse.json({ error: "venue not found" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const imageDataUrl = `data:${file.type || "image/jpeg"};base64,${buf.toString("base64")}`;

  const r = await readPhoto({ imageDataUrl, feature, reference, tiltDeg: tiltDeg != null && !Number.isNaN(tiltDeg) ? tiltDeg : null });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });

  let saved = false;
  if (form.get("save") === "1" && r.output.reading_confidence !== "cant_tell") {
    addEvidence(venueId, toFeatureValue(r.output, role, reference, tiltDeg));
    saved = true;
  }

  const raiseHint =
    r.output.reading_confidence === "low"
      ? "Add a reference (A4 sheet, phone held upright, or a standard door in frame) to raise this from Low to Medium."
      : r.output.reading_confidence === "medium" && feature === "ramp"
        ? "Lay your phone on the ramp and use the tilt reading to raise this to High."
        : null;

  const result = saved ? evaluateVenue(getVenue(venueId)!, profile, { companion }) : null;
  return NextResponse.json({ output: r.output, provider: r.provider, saved, raise_hint: raiseHint, result });
}
