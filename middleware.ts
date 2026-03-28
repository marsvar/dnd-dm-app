import { NextResponse, type NextRequest } from "next/server";

const INVITE_CONTEXT_COOKIE = "invite_context";
const INVITE_FALLBACK_COOKIE = "invite_context_fallback";

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const hasToken = searchParams.has("token");
  const hasContext = searchParams.has("context");
  const hasInviteCookie = Boolean(req.cookies.get(INVITE_CONTEXT_COOKIE)?.value);
  const hasFallbackCookie = Boolean(req.cookies.get(INVITE_FALLBACK_COOKIE)?.value);

  const isPlayerWelcome = pathname === "/player/welcome";
  const isPlayerOnboarding = pathname.startsWith("/player/onboarding");
  const isPlayerImport = pathname.startsWith("/player/import");
  const isInviteExchange = pathname === "/invite/exchange";

  const inviteGated = hasInviteCookie && (isPlayerOnboarding || isPlayerImport);
  const suppressAnalytics = hasToken || hasContext || hasFallbackCookie || inviteGated;
  const requiresNoStore = isPlayerWelcome || isInviteExchange || inviteGated;
  const shouldRedactQuery = isPlayerWelcome || hasContext || hasFallbackCookie;
  const minimalShell = hasToken || hasContext;

  const res = NextResponse.next();

  if (requiresNoStore) {
    res.headers.set("Cache-Control", "no-store");
  }

  if (isPlayerWelcome || isPlayerOnboarding || isPlayerImport || isInviteExchange) {
    res.headers.set("Referrer-Policy", "no-referrer");
  }

  if (suppressAnalytics) {
    res.headers.set("x-invite-suppress-analytics", "true");
  }

  if (minimalShell) {
    res.headers.set("x-invite-minimal", "true");
  }

  if (shouldRedactQuery) {
    res.headers.set("x-redact-query", "true");
  }

  if (hasContext) {
    res.cookies.set(INVITE_FALLBACK_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/player",
      maxAge: 10 * 60,
    });
  }

  return res;
}

export const config = {
  matcher: ["/player/:path*", "/invite/exchange"],
};
