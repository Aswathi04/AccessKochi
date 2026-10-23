// POST /api/host/venues/:id/reports/:reportId {reply} -> the host's public reply to a visitor report.
// Approved hosts only (a reply is public). A reply never changes the verdict; conflicts stay flagged.
import { NextResponse } from "next/server";
import { invalidateHostCache } from "@/lib/host";
import { requireEditor } from "@/lib/hostAuth";
import { logAction, serverClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string; reportId: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const { id, reportId } = await params;
  const g = await requireEditor(req, id);
  if ("error" in g) return g.error;
  if (g.claim?.status !== "approved") return NextResponse.json({ error: "You can reply once an admin approves your claim" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const reply = typeof body?.reply === "string" ? body.reply.trim().slice(0, 500) : "";
  if (!reply) return NextResponse.json({ error: "Write a reply" }, { status: 400 });
  const { data, error } = await serverClient().from("visitor_reports")
    .update({ host_reply: reply, host_reply_by: g.email, host_reply_at: new Date().toISOString() })
    .eq("id", reportId).eq("venue_id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  await logAction(g.email, "report.reply", id, { report_id: reportId });
  invalidateHostCache();
  return NextResponse.json({ ok: true });
}
