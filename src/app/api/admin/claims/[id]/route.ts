// POST /api/admin/claims/:id {decision: approved|rejected|more_info, note} -> decide a claim
import { NextResponse } from "next/server";
import { invalidateHostCache } from "@/lib/host";
import { requireUser } from "@/lib/hostAuth";
import { logAction, serverClient } from "@/lib/supabase";

const DECISIONS = ["approved", "rejected", "more_info"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requireUser(req);
  if ("error" in g) return g.error;
  if (!g.admin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!DECISIONS.includes(decision)) return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  if (decision !== "approved" && !note) return NextResponse.json({ error: "Give the host a reason" }, { status: 400 });

  const { data, error } = await serverClient().from("claims")
    .update({ status: decision, admin_note: note || null, decided_by: g.email, decided_at: new Date().toISOString() })
    .eq("id", id).select("venue_id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(g.email, `claim.${decision}`, data.venue_id, { claim_id: id, note });
  invalidateHostCache();
  return NextResponse.json({ ok: true });
}
