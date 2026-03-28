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

const PUBLIC_PATHS = ["/login", "/signup", "/select-role", "/design-system", "/player"];
const PUBLIC_PREFIXES = ["/player/", "/_next/", "/favicon"];
const INVITE_CONTEXT_COOKIE = "invite_context";
const INVITE_FALLBACK_COOKIE = "invite_context_fallback";

function isPublicRoute(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasToken = searchParams.has("token");
  const hasContext = searchParams.has("context");
  const hasInviteCookie = Boolean(request.cookies.get(INVITE_CONTEXT_COOKIE)?.value);
  const hasFallbackCookie = Boolean(request.cookies.get(INVITE_FALLBACK_COOKIE)?.value);

  const isPlayerWelcome = pathname === "/player/welcome";
  const isPlayerOnboarding = pathname.startsWith("/player/onboarding");
  const isPlayerImport = pathname.startsWith("/player/import");
  const isInviteExchange = pathname === "/invite/exchange";

  const inviteGated = hasInviteCookie && (isPlayerOnboarding || isPlayerImport);
  const suppressAnalytics = hasToken || hasContext || hasFallbackCookie || inviteGated;
  const requiresNoStore = isPlayerWelcome || isInviteExchange || inviteGated;
  const shouldRedactQuery = isPlayerWelcome || hasContext || hasFallbackCookie;
  const minimalShell = hasToken || hasContext;

  const response = NextResponse.next({ request });

  if (requiresNoStore) {
    response.headers.set("Cache-Control", "no-store");
  }

  if (isPlayerWelcome || isPlayerOnboarding || isPlayerImport || isInviteExchange) {
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  if (suppressAnalytics) {
    response.headers.set("x-invite-suppress-analytics", "true");
  }

  if (minimalShell) {
    response.headers.set("x-invite-minimal", "true");
  }

  if (shouldRedactQuery) {
    response.headers.set("x-redact-query", "true");
  }

  if (hasContext) {
    response.cookies.set(INVITE_FALLBACK_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/player",
      maxAge: 10 * 60,
    });
  }

  // Skip auth entirely for public routes (avoids requiring Supabase env vars).
  if (isPublicRoute(pathname)) {
    return response;
  }

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
