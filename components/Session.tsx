"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserDb, isConfigured } from "@/lib/supabase";
import type { Faction } from "@/lib/world";
type Profile = { id: string; display_name: string; faction: Faction };
type SessionValue = { user: User | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; api: (url: string, init?: RequestInit) => Promise<Response>; signOut: () => Promise<void> };
const Context = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const db = browserDb();
    const { data } = await db.auth.getUser();
    setUser(data.user);
    if (data.user) {
      const { data: p } = await db.from("profiles").select("id,display_name,faction").eq("id", data.user.id).maybeSingle();
      setProfile(p as Profile | null);
    } else setProfile(null);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!isConfigured) return;
    queueMicrotask(() => { void refresh(); });
    const { data: listener } = browserDb().auth.onAuthStateChange(() => { queueMicrotask(() => { void refresh(); }); });
    return () => listener.subscription.unsubscribe();
  }, [refresh]);
  const api = useCallback(async (url: string, init: RequestInit = {}) => {
    if (!isConfigured) throw new Error("Connect a Supabase project to use this feature");
    const { data } = await browserDb().auth.getSession();
    if (!data.session) throw new Error("Sign in to continue");
    return fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${data.session.access_token}` } });
  }, []);
  const signOut = useCallback(async () => { if (isConfigured) { await browserDb().auth.signOut(); await refresh(); } }, [refresh]);
  return <Context.Provider value={{ user, profile, loading, refresh, api, signOut }}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error("SessionProvider missing"); return value; }
