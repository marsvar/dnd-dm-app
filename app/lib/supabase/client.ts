import { createBrowserClient } from "@supabase/ssr";

/**
 * createSupabaseClient — browser-side Supabase client.
 * Safe to call in components / hooks; creates a new instance per call
 * (the underlying library de-duplicates by URL + key).
 */
export function createSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
