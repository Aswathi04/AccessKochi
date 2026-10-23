// GET  /api/host/venues/:id -> checklist sections, saved answers (with AI photo checks), live status, claim,
//                              section scores, documents, visitor reports, insights, and a preview of the
//                              verdict per profile with the host's answers applied.
// PUT  /api/host/venues/:id  {item_id, answer, reason?, values?} -> save one answer
// POST /api/host/venues/:id  (multipart: item_id, file) -> attach a photo to an answered item; the AI checks it
import { NextResponse } from "next/server";
import { ITEMS, sectionsFor, type Answer } from "@/data/checklist";
import {
  answersToFeatures, compareReading, docValid, invalidateHostCache, loadSkips, rankFixes, recentReports, sectionScores, statusToFeatures,
  type AnswerRow, type DocRow, type StatusRow,
} from "@/lib/host";
import { requireEditor } from "@/lib/hostAuth";
import { evaluateVenue } from "@/lib/matcher";
import { getVenue } from "@/lib/store";
import { BUCKET, logAction, serverClient } from "@/lib/supabase";
import type { FeatureName, ProfileId } from "@/lib/types";
import { readPhoto } from "@/lib/vision";

export const runtime = "nodejs";
export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };
const ANSWERS: Answer[] = ["yes", "no", "not_sure", "na"];
const PROFILES: ProfileId[] = ["wheelchair", "crutches", "low_stamina"];
const VISION_FEATURES: FeatureName[] = ["entrance", "ramp", "toilet", "lift", "dropoff_path"];

const signed = async (path: string | null | undefined) =>
  path ? (await serverClient().storage.from(BUCKET).createSignedUrl(path, 600)).data?.signedUrl ?? null : null;

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const venue = getVenue(id);
  if (!venue) return NextResponse.json({ error: "Unknown venue" }, { status: 404 });
  const g = await requireEditor(req, id, false);
  if ("error" in g) return g.error;

  const db = serverClient();
  const [{ data: answers }, { data: status }, docsRes, reports, skips] = await Promise.all([
    db.from("checklist_answers").select("*").eq("venue_id", id),
    db.from("live_status").select("*").eq("venue_id", id),
    db.from("documents").select("*").eq("venue_id", id).order("created_at", { ascending: false }),
    recentReports(id, 20),
    loadSkips(id),
  ]);
  const rows = (answers ?? []) as AnswerRow[];
  const docs = (docsRes.data ?? []) as (DocRow & { file_path: string })[];
  const photoUrls: Record<string, string> = {};
  for (const r of rows) { const u = await signed(r.photo_path); if (u) photoUrls[r.item_id] = u; }
  const documents = await Promise.all(docs.map(async (d) => ({ ...d, valid: docValid(d), file_url: await signed(d.file_path) })));

  const sections = sectionsFor(venue);
  const byItem = Object.fromEntries(rows.map((r) => [r.item_id, r.answer]));
  // Preview = what users would see once published (seed + visitor evidence + these host answers).
  const draft = { ...venue, features: [...venue.features, ...answersToFeatures(rows, docs), ...statusToFeatures((status ?? []) as StatusRow[])] };
  const preview = Object.fromEntries(PROFILES.map((p) => [p, evaluateVenue(draft, p)])) as Record<ProfileId, ReturnType<typeof evaluateVenue>>;
  const skipCount = Object.fromEntries(skips.map((s) => [s.profile, s.count]));

  return NextResponse.json({
    venue: { id: venue.id, name: venue.name, category: venue.category, area: venue.area, address: venue.address },
    claim: g.claim ?? null, admin: g.admin, readOnly: !g.claim,
    sections, answers: rows, photoUrls, status: status ?? [], scores: sectionScores(sections, byItem), preview,
    documents, documentsReady: !docsRes.error, reports,
    insights: { skips, fixes: rankFixes(preview, skipCount) },
  });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => null);
  const item = ITEMS[body?.item_id];
  const answer = body?.answer as Answer;
  if (!item || !ANSWERS.includes(answer)) return NextResponse.json({ error: "Invalid item or answer" }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : null;
  if (answer === "na" && !reason) return NextResponse.json({ error: "Say why it doesn't apply" }, { status: 400 });
  const values: Record<string, number> = {};
  for (const inp of item.inputs ?? []) {
    const v = Number(body.values?.[inp.key]);
    if (body.values?.[inp.key] !== undefined && body.values?.[inp.key] !== "" && Number.isFinite(v) && v >= 0 && v < 1_000_000) values[inp.key] = v;
  }
  const { error } = await serverClient().from("checklist_answers").upsert({
    venue_id: id, item_id: item.id, answer, reason, values, updated_by: g.user.id, updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // A changed answer makes an earlier AI photo check stale.
  await serverClient().from("checklist_answers").update({ ai_check: null }).eq("venue_id", id).eq("item_id", item.id);
  await logAction(g.email, "checklist.save", id, { item_id: item.id, answer, values });
  invalidateHostCache();
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  const form = await req.formData();
  const item_id = String(form.get("item_id") ?? "");
  const file = form.get("file");
  const item = ITEMS[item_id];
  if (!item) return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  if (!(file instanceof File) || !file.type.startsWith("image/")) return NextResponse.json({ error: "Attach a photo" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Photo too large (max 10 MB)" }, { status: 400 });

  const db = serverClient();
  const { data: row } = await db.from("checklist_answers").select("answer").eq("venue_id", id).eq("item_id", item_id).maybeSingle();
  if (!row) return NextResponse.json({ error: "Answer the item before adding a photo" }, { status: 400 });
  const path = `checklist/${id}/${item_id}-${Date.now()}.jpg`;
  const buf = Buffer.from(await file.arrayBuffer());
  const up = await db.storage.from(BUCKET).upload(path, buf, { contentType: file.type });
  if (up.error) return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });
  await db.from("checklist_answers").update({ photo_path: path, updated_at: new Date().toISOString() }).eq("venue_id", id).eq("item_id", item_id);

  // AI check: only for items whose answer sets something the vision model can see.
  const patch = row.answer === "yes" ? item.onYes : row.answer === "no" ? item.onNo : undefined;
  let ai_check = null;
  if (patch && VISION_FEATURES.includes(patch.feature)) {
    const r = await readPhoto({ imageDataUrl: `data:${file.type};base64,${buf.toString("base64")}`, feature: patch.feature, reference: "none", tiltDeg: null });
    if (!("error" in r)) {
      ai_check = { ...compareReading(patch.attrs, r.output.attributes, r.output.is_subject_visible), at: new Date().toISOString() };
      const { error } = await db.from("checklist_answers").update({ ai_check }).eq("venue_id", id).eq("item_id", item_id);
      if (error) console.warn("[host] ai_check not saved (run supabase/schema.sql again):", error.message);
    }
  }
  await logAction(g.email, "checklist.photo", id, { item_id, path, ai: ai_check?.verdict ?? null });
  invalidateHostCache();
  return NextResponse.json({ ok: true, ai_check });
}
