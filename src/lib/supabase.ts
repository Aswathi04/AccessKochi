// Supabase clients. Server code uses the service-role key and checks permissions itself
// (tables have RLS on with no policies). The browser client is only used for email-code sign-in.
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const BUCKET = "host-evidence";

export function supabaseConfigured(): boolean {
  return !!(url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

let admin: SupabaseClient | null = null;
export function serverClient(): SupabaseClient {
  if (!supabaseConfigured()) throw new Error("Supabase is not configured (see .env.example)");
  admin ??= createClient(url!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return admin;
}

let browser: SupabaseClient | null = null;
export function browserClient(): SupabaseClient {
  if (!url || !anon) throw new Error("Supabase is not configured");
  browser ??= createClient(url, anon);
  return browser;
}

// The browser sends its access token as "Authorization: Bearer <token>".
export async function userFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !supabaseConfigured()) return null;
  const { data, error } = await serverClient().auth.getUser(token);
  return error ? null : data.user;
}

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export async function logAction(actor: string, action: string, venue_id: string | null, detail: unknown): Promise<void> {
  await serverClient().from("audit_log").insert({ actor, action, venue_id, detail });
}
