"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { browserDb, isConfigured } from "@/lib/supabase";
import type { Faction } from "@/lib/world";
type Profile = { id: string; display_name: string; faction: Faction; created_at: string };
type SessionValue = { user: User | null; profile: Profile | null; profileError: string; loading: boolean; refresh: () => Promise<void>; api: (url: string, init?: RequestInit) => Promise<Response>; signOut: () => Promise<void> };
const Context = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(isConfigured);
  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const db = browserDb();
    const { data, error: authError } = await db.auth.getUser();
    if (authError) { setUser(null); setProfile(null); setProfileError("Account verification failed. Please sign in again."); setLoading(false); return; }
    setUser(data.user);
    if (data.user) {
      const { data: p, error } = await db.from("profiles").select("id,display_name,faction,created_at").eq("id", data.user.id).maybeSingle();
      setProfile(error ? null : p as Profile | null);
      setProfileError(error ? "Could not load your saved profile. Please retry." : "");
    } else { setProfile(null); setProfileError(""); }
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
  return <Context.Provider value={{ user, profile, profileError, loading, refresh, api, signOut }}>{children}</Context.Provider>;
}
export function useSession() { const value = useContext(Context); if (!value) throw new Error("SessionProvider missing"); return value; }
