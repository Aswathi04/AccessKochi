// GET /api/admin/documents?status=pending -> document queue with a short-lived link to each file
import { NextResponse } from "next/server";
import { DOC_KINDS, type DocKind } from "@/data/documents";
import { venuesById } from "@/data/venues";
import { requireUser } from "@/lib/hostAuth";
import { BUCKET, serverClient } from "@/lib/supabase";

export async function GET(req: Request) {
  const g = await requireUser(req);
  if ("error" in g) return g.error;
  if (!g.admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const db = serverClient();
  let q = db.from("documents").select("*").order("created_at", { ascending: true }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const documents = await Promise.all((data ?? []).map(async (d) => {
    const v = venuesById[d.venue_id];
    const file_url = (await db.storage.from(BUCKET).createSignedUrl(d.file_path, 600)).data?.signedUrl ?? null;
    return { ...d, file_url, label: DOC_KINDS[d.kind as DocKind]?.label ?? d.kind, check: DOC_KINDS[d.kind as DocKind]?.check ?? "", venue: v ? { name: v.name, address: v.address } : null };
  }));
  return NextResponse.json({ documents });
}
