// Permission checks for the host/admin API routes.
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdmin, serverClient, supabaseConfigured, userFromRequest } from "./supabase";

export type Guarded = { user: User; email: string; admin: boolean } | { error: NextResponse };

export async function requireUser(req: Request): Promise<Guarded> {
  if (!supabaseConfigured()) return { error: NextResponse.json({ error: "Host dashboard is not configured on this server" }, { status: 503 }) };
  const user = await userFromRequest(req);
  if (!user?.email) return { error: NextResponse.json({ error: "Please sign in" }, { status: 401 }) };
  return { user, email: user.email, admin: isAdmin(user.email) };
}

// Hosts can edit (as drafts) once they have a non-rejected claim; edits are published only after approval.
export async function claimFor(userId: string, venueId: string) {
  const { data } = await serverClient().from("claims").select("*").eq("user_id", userId).eq("venue_id", venueId)
    .neq("status", "rejected").order("created_at", { ascending: false }).limit(1);
  return data?.[0] ?? null;
}

// Admins can open any venue read-only (to review); only the claimant writes, so answers always come from the host.
export async function requireEditor(req: Request, venueId: string, write = true): Promise<Guarded & { claim?: Record<string, unknown> | null }> {
  const g = await requireUser(req);
  if ("error" in g) return g;
  const claim = await claimFor(g.user.id, venueId);
  if (!claim && !(g.admin && !write)) return { error: NextResponse.json({ error: g.admin ? "Admins can view but not edit a venue's answers" : "Claim this venue first" }, { status: 403 }) };
  return { ...g, claim };
}
