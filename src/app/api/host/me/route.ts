// GET /api/host/me -> signed-in host's email, admin flag and claims
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/hostAuth";
import { serverClient } from "@/lib/supabase";
import { venuesById } from "@/data/venues";

export async function GET(req: Request) {
  const g = await requireUser(req);
  if ("error" in g) return g.error;
  const { data, error } = await serverClient().from("claims").select("id, venue_id, role, status, dispute, admin_note, created_at")
    .eq("user_id", g.user.id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const claims = (data ?? []).map((c) => ({ ...c, venue_name: venuesById[c.venue_id]?.name ?? c.venue_id }));
  return NextResponse.json({ email: g.email, admin: g.admin, claims });
}
