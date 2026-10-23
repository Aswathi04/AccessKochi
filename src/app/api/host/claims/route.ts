// POST /api/host/claims (multipart): venue_id, full_name, role, proof_type, proof_note, file
// Creates a pending claim. An admin approves it before anything the host enters is published.
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/hostAuth";
import { BUCKET, logAction, serverClient } from "@/lib/supabase";
import { venuesById } from "@/data/venues";

export const runtime = "nodejs";

const ROLES = ["owner", "manager", "staff"];
const PROOFS = ["trade_licence", "gst", "fssai", "video", "other"];
const MAX = 50 * 1024 * 1024;
const OK_TYPE = /^(image\/|video\/|application\/pdf$)/;

export async function POST(req: Request) {
  const g = await requireUser(req);
  if ("error" in g) return g.error;
  if (g.admin) return NextResponse.json({ error: "Admin accounts can't claim venues. Use a separate host account." }, { status: 403 });
  const form = await req.formData();
  const venue_id = String(form.get("venue_id") ?? "");
  const full_name = String(form.get("full_name") ?? "").trim().slice(0, 120);
  const role = String(form.get("role") ?? "");
  const proof_type = String(form.get("proof_type") ?? "");
  const proof_note = String(form.get("proof_note") ?? "").trim().slice(0, 1000);
  const file = form.get("file");

  if (!venuesById[venue_id]) return NextResponse.json({ error: "Unknown venue" }, { status: 400 });
  if (!full_name) return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  if (!ROLES.includes(role) || !PROOFS.includes(proof_type)) return NextResponse.json({ error: "Invalid role or proof type" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Attach a document or video as proof" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 400 });
  if (!OK_TYPE.test(file.type)) return NextResponse.json({ error: "Upload a photo, PDF or video" }, { status: 400 });

  const db = serverClient();
  const { data: existing } = await db.from("claims").select("user_id, status").eq("venue_id", venue_id).neq("status", "rejected");
  if (existing?.some((c) => c.user_id === g.user.id)) return NextResponse.json({ error: "You already have a claim for this venue" }, { status: 409 });
  const dispute = !!existing?.some((c) => c.status === "approved");

  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
  const proof_path = `claims/${venue_id}/${g.user.id}-${Date.now()}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(proof_path, file, { contentType: file.type });
  if (up.error) return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });

  const { data, error } = await db.from("claims")
    .insert({ venue_id, user_id: g.user.id, email: g.email, full_name, role, proof_type, proof_path, proof_note, dispute })
    .select("id, status, dispute").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(g.email, "claim.create", venue_id, { claim_id: data.id, proof_type, dispute });
  return NextResponse.json(data);
}
