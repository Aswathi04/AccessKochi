"use client";
// The user's profile, shared across screens via React context and kept in this browser
// (localStorage, wrapped in try/catch so private mode still works). When signed in it is also
// saved to the account (Supabase user_metadata) so it follows the person to another phone.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { hostConfigured } from "./hostClient";
import { browserClient } from "./supabase";
import { t as translate, type Lang, type StringKey } from "./i18n";
import type { Companion, ProfileId } from "./types";

export interface Settings {
  name: string;
  profile: ProfileId;
  companion: Companion;
  language: Lang;
  area: string | null;
  location: { lat: number; lng: number } | null;
  onboarded: boolean;
}

const KEY = "accesskochi.settings.v1";
export const DEFAULT_SETTINGS: Settings = {
  name: "", profile: "wheelchair", companion: "alone", language: "en", area: "Edappally",
  location: { lat: 10.0261, lng: 76.3125 }, onboarded: false,
};

interface Ctx { settings: Settings; save: (p: Partial<Settings>) => void; loaded: boolean; t: (k: StringKey) => string }
const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setState] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { document.documentElement.lang = settings.language; }, [settings.language]);

  const signedIn = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const push = useCallback((s: Settings) => {
    clearTimeout(timer.current); // typing a name saves on every key; send once it settles
    timer.current = setTimeout(() => browserClient().auth.updateUser({ data: { settings: s } }), 1000);
  }, []);
  useEffect(() => {
    if (!loaded || !hostConfigured) return;
    const { data } = browserClient().auth.onAuthStateChange((event, session) => {
      signedIn.current = !!session;
      if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION")) return;
      const saved = session.user.user_metadata?.settings as Partial<Settings> | undefined;
      // The account wins (it may come from another phone); language stays whatever this device chose.
      if (saved) setState((prev) => {
        const next = { ...DEFAULT_SETTINGS, ...saved, language: prev.language };
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
        return next;
      });
      else setState((prev) => { if (prev.onboarded) push(prev); return prev; });
    });
    return () => data.subscription.unsubscribe();
  }, [loaded, push]);

  const save = useCallback((patch: Partial<Settings>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
      if (signedIn.current) push(next);
      return next;
    });
  }, [push]);
  const t = useCallback((k: StringKey) => translate(settings.language, k), [settings.language]);
  return <SettingsContext.Provider value={{ settings, save, loaded, t }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const c = useContext(SettingsContext);
  if (!c) throw new Error("useSettings must be used inside SettingsProvider");
  return c;
}
