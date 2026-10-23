// GET /api/admin/claims?status=pending -> claims queue with a short-lived link to each proof file
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/hostAuth";
import { BUCKET, serverClient } from "@/lib/supabase";
import { venuesById } from "@/data/venues";

export async function GET(req: Request) {
  const g = await requireUser(req);
  if ("error" in g) return g.error;
  if (!g.admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const status = new URL(req.url).searchParams.get("status") ?? "pending";
  const db = serverClient();
  let q = db.from("claims").select("*").order("created_at", { ascending: true }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const claims = await Promise.all((data ?? []).map(async (c) => {
    const v = venuesById[c.venue_id];
    const signed = c.proof_path ? (await db.storage.from(BUCKET).createSignedUrl(c.proof_path, 600)).data?.signedUrl ?? null : null;
    return { ...c, proof_url: signed, venue: v ? { name: v.name, address: v.address, phone: v.phone } : null };
  }));
  return NextResponse.json({ claims });
}
