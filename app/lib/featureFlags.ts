/**
 * featureFlags.ts
 *
 * Boolean feature gates driven by NEXT_PUBLIC_FEATURE_* env vars.
 * All flags default to false (off) unless explicitly set to "true".
 *
 * To enable a feature locally: add to .env.local
 * To enable on Vercel: set the env var in the project dashboard → Redeploy
 */

/** Auth (NextAuth + Supabase login). Requires next-auth + @supabase/ssr installed. */
export const FEATURE_AUTH =
  process.env.NEXT_PUBLIC_FEATURE_AUTH === "true";

/** Supabase real-time sync. Requires FEATURE_AUTH and Supabase env vars. */
export const FEATURE_SUPABASE_SYNC =
  process.env.NEXT_PUBLIC_FEATURE_SUPABASE_SYNC === "true";

/** Export a completed encounter as a formatted session log. */
export const FEATURE_SESSION_EXPORT =
  process.env.NEXT_PUBLIC_FEATURE_SESSION_EXPORT === "true";
