import { createBrowserClient } from "@supabase/ssr";

/**
 * createSupabaseClient — browser-side Supabase client.
 * Safe to call in components / hooks; re-uses the same instance per request.
 */
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
