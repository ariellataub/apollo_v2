import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Cookies are async in Next.js 15+/16, so this helper is async.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll was called from a Server Component — Server Components
            // can't write cookies. Safe to ignore: any subsequent Server
            // Action or Route Handler call will refresh on its own.
          }
        },
      },
    },
  );
}
