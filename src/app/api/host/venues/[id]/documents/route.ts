// POST /api/host/venues/:id/documents (multipart): kind, ref_no, issued_by, issued_on, expires_on, sections (JSON array), file
// Adds a document for admin review. It counts only once approved, and stops counting when it expires.
import { NextResponse } from "next/server";
import { SECTIONS } from "@/data/checklist";
import { DOC_KINDS, type DocKind } from "@/data/documents";
import { requireEditor } from "@/lib/hostAuth";
import { BUCKET, logAction, serverClient } from "@/lib/supabase";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const MAX = 20 * 1024 * 1024;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  const form = await req.formData();
  const kind = String(form.get("kind") ?? "") as DocKind;
  const info = DOC_KINDS[kind];
  const text = (k: string, n: number) => String(form.get(k) ?? "").trim().slice(0, n) || null;
  const date = (k: string) => { const v = String(form.get(k) ?? ""); return DATE.test(v) ? v : null; };
  const issued_on = date("issued_on"), expires_on = date("expires_on");
  let picked: unknown = [];
  try { picked = JSON.parse(String(form.get("sections") ?? "[]")); } catch { /* validated below */ }
  const valid = new Set(SECTIONS.map((s) => s.id));
  const sections = info?.sections ?? (Array.isArray(picked) ? picked.filter((s): s is string => typeof s === "string" && valid.has(s)) : []);
  const file = form.get("file");

  if (!info) return NextResponse.json({ error: "Choose a document type" }, { status: 400 });
  if (!sections.length) return NextResponse.json({ error: "Tick the checklist sections this document covers" }, { status: 400 });
  if (info.needsExpiry && !expires_on) return NextResponse.json({ error: "Enter the expiry date" }, { status: 400 });
  if (issued_on && expires_on && expires_on < issued_on) return NextResponse.json({ error: "Expiry is before the issue date" }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Attach the document" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  if (!/^(image\/|application\/pdf$)/.test(file.type)) return NextResponse.json({ error: "Upload a PDF or photo" }, { status: 400 });

  const db = serverClient();
  const ext = file.type === "application/pdf" ? "pdf" : "jpg";
  const file_path = `documents/${id}/${kind}-${Date.now()}.${ext}`;
  const up = await db.storage.from(BUCKET).upload(file_path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (up.error) return NextResponse.json({ error: `Upload failed: ${up.error.message}` }, { status: 500 });
  const { data, error } = await db.from("documents").insert({
    venue_id: id, user_id: g.user.id, kind, ref_no: text("ref_no", 80), issued_by: text("issued_by", 120), issued_on, expires_on, sections, file_path,
  }).select("id, status").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(g.email, "document.create", id, { document_id: data.id, kind, sections });
  return NextResponse.json(data);
}
