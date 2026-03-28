export type InviteRole = "dm" | "player";

export type InviteConflictAction = "insert" | "noop" | "conflict";

export type RedirectValidationResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

const DEFAULT_REDIRECT = "/player";

export function resolveMembershipConflict(
  existingRole: InviteRole | null,
  inviteRole: InviteRole
): InviteConflictAction {
  if (!existingRole) return "insert";
  if (existingRole === inviteRole) return "noop";
  return "conflict";
}

export function isInviteExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (!Number.isFinite(expiry.getTime())) return true;
  return expiry.getTime() <= now.getTime();
}

export function getAllowedRedirectOrigins(): string[] {
  const candidates = [
    process.env.NEXTAUTH_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  return candidates
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        return null;
      }
    })
    .filter((value): value is string => Boolean(value));
}

export function validateRedirectTarget(
  redirect: string | null,
  allowedOrigins: string[]
): RedirectValidationResult {
  if (!redirect) return { ok: true, redirectTo: DEFAULT_REDIRECT };

  if (redirect.startsWith("/")) {
    return { ok: true, redirectTo: redirect };
  }

  let parsed: URL;
  try {
    parsed = new URL(redirect);
  } catch {
    return { ok: false, error: "Invalid redirect URL" };
  }

  if (!allowedOrigins.includes(parsed.origin)) {
    return { ok: false, error: "Redirect URL not allowed" };
  }

  return { ok: true, redirectTo: `${parsed.pathname}${parsed.search}${parsed.hash}` };
}
