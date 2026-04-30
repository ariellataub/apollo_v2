import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role Supabase client for trusted server-side operations.
 * Bypasses RLS — NEVER expose this client or its key to the browser.
 * Use only in Server Actions, Route Handlers, and server-only lib code.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!serviceRoleKey)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from Supabase Dashboard → Project Settings → API.",
    );

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      // Disable session persistence — this is a one-shot server client.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
