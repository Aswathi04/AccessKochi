"use client";
// Browser side of the host dashboard: email-code sign-in session + authenticated fetch.
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { browserClient } from "./supabase";

export const hostConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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
