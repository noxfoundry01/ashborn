import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const isConfigured = Boolean(url && key);
export function browserDb() {
  if (!url || !key) throw new Error("Supabase is not configured");
  return createBrowserClient(url, key);
}
export function publicDb() {
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
export function adminDb() {
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Server database is not configured");
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
export async function requestUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const db = publicDb();
  if (!db || !token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}
