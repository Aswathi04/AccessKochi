// PUT    /api/host/venues/:id/status {kind, hours, note?} -> turn on a live status until now + hours
// DELETE /api/host/venues/:id/status?kind=lift_out_of_order -> clear it
import { NextResponse } from "next/server";
import { invalidateHostCache } from "@/lib/host";
import { requireEditor } from "@/lib/hostAuth";
import { logAction, serverClient } from "@/lib/supabase";

const KINDS = ["lift_out_of_order", "ramp_blocked", "toilet_closed"];
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  const body = await req.json().catch(() => null);
  const hours = Number(body?.hours);
  if (!KINDS.includes(body?.kind) || !(hours > 0 && hours <= 24 * 30)) return NextResponse.json({ error: "Invalid status or duration" }, { status: 400 });
  const now = new Date();
  const row = {
    venue_id: id, kind: body.kind, until: new Date(now.getTime() + hours * 3600_000).toISOString(),
    note: typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null, updated_by: g.user.id, updated_at: now.toISOString(),
  };
  const { error } = await serverClient().from("live_status").upsert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(g.email, "status.set", id, { kind: row.kind, until: row.until });
  invalidateHostCache();
  return NextResponse.json(row);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  const kind = new URL(req.url).searchParams.get("kind") ?? "";
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const { error } = await serverClient().from("live_status").delete().eq("venue_id", id).eq("kind", kind);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAction(g.email, "status.clear", id, { kind });
  invalidateHostCache();
  return NextResponse.json({ ok: true });
}
