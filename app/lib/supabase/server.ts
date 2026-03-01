import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * createSupabaseServerClient — server-side Supabase client for use in
 * Server Components, Server Actions, and Route Handlers.
 * Reads and writes the auth session from Next.js cookies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );
}
