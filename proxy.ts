import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Auth proxy — two jobs:
 * 1. Refresh the Supabase session cookie on every request (keeps JWTs fresh).
 * 2. Redirect unauthenticated users away from DM routes to /login.
 *
 * Public routes that never require auth:
 *   /login, /signup, /select-role, /player/**, /_next/**, /favicon.ico
 */

const PUBLIC_PATHS = ["/login", "/signup", "/select-role", "/design-system"];
const PUBLIC_PREFIXES = ["/player/", "/_next/", "/favicon"];

function isPublicRoute(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  // Skip auth entirely for public routes (avoids requiring Supabase env vars).
  if (isPublicRoute(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  // Build a mutable response so we can forward refreshed auth cookies.
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  // Refresh the session (no-op if still valid, refreshes if expired).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users on protected routes to /login.
  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Run on all routes except static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
