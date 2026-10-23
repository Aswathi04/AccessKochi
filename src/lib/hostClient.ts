"use client";
// Browser side of accounts: email-code sign-in session, route guard, authenticated fetch.
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { browserClient } from "./supabase";

export const hostConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// How the person said they use the app. Kept in user_metadata, which the user can edit, so it only
// picks the landing page; access is still checked on the server (ADMIN_EMAILS, claims).
export type Uses = "visitor" | "host" | "both";
export const usesOf = (s: Session | null): Uses | undefined => s?.user.user_metadata?.uses;
export const setUses = (uses: Uses) => browserClient().auth.updateUser({ data: { uses } });

export function useHostSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(hostConfigured);
  useEffect(() => {
    if (!hostConfigured) return;
    const sb = browserClient();
    sb.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

// Signed-out visitors to a protected page go to /signin and come back here afterwards.
export function useRequireSession() {
  const s = useHostSession();
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (!s.loading && !s.session) router.replace(`/signin?next=${encodeURIComponent(path)}`);
  }, [s.loading, s.session, router, path]);
  return s;
}

export async function signOut(router: { replace: (href: string) => void }) {
  await browserClient().auth.signOut();
  router.replace("/");
}

export async function hostFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await browserClient().auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (init.body && typeof init.body === "string") headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json as T;
}
