import type { SupabaseClient } from "@supabase/supabase-js";
import { isInviteExpired } from "./inviteService.ts";

export const INVITE_TTL_MINUTES = 30;
export const INVITE_TTL_MAX_HOURS = 4;
export const FALLBACK_TTL_MINUTES = 10;
export const PROVISIONAL_HOLD_MINUTES = 2;

export type InviteContextRow = {
  id: string;
  public_id: string;
  invite_id: string;
  user_id: string | null;
  target_email: string | null;
  reserved_for_user_id: string | null;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
};

export type CampaignInviteRow = {
  id: string;
  campaign_id: string;
  role: "dm" | "player";
  token: string;
  expires_at: string;
  created_by: string;
  target_email: string | null;
  status: "pending" | "accepted_pending_assignment" | "accepted" | "revoked";
  reserved_for_user_id: string | null;
  accepted_by_user_id: string | null;
  accepted_at: string | null;
  updated_at: string;
};

export type ExchangeResult =
  | {
      ok: true;
      context: InviteContextRow;
      invite: CampaignInviteRow;
      publicId: string;
    }
  | { ok: false; code: "not_found" | "expired" | "revoked" | "reserved" | "email_mismatch" | "unverified"; error: string };

export function isExpired(expiresAt: string | Date, now: Date = new Date()): boolean {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  if (!Number.isFinite(expiry.getTime())) return true;
  return expiry.getTime() <= now.getTime();
}

export function canExtendTtl(
  lastSeenAt: string | Date,
  now: Date = new Date(),
  ttlMinutes: number = INVITE_TTL_MINUTES
): boolean {
  const lastSeen = typeof lastSeenAt === "string" ? new Date(lastSeenAt) : lastSeenAt;
  if (!Number.isFinite(lastSeen.getTime())) return false;
  const diffMs = now.getTime() - lastSeen.getTime();
  if (diffMs < 0) return false;
  return diffMs <= ttlMinutes * 60 * 1000;
}

export function computeExpiry(
  createdAt: string | Date,
  now: Date = new Date(),
  ttlMinutes: number = INVITE_TTL_MINUTES
): Date {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const maxExpiry = new Date(created.getTime() + INVITE_TTL_MAX_HOURS * 60 * 60 * 1000);
  const candidate = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  return candidate.getTime() > maxExpiry.getTime() ? maxExpiry : candidate;
}

function requireVerifiedEmail(email: string | null | undefined): email is string {
  return typeof email === "string" && email.length > 0;
}

export async function extendContextTtl(
  supabase: SupabaseClient,
  contextId: string,
  now: Date = new Date()
): Promise<InviteContextRow | null> {
  const { data: context, error } = await supabase
    .from("invite_contexts")
    .select("id, public_id, invite_id, user_id, target_email, reserved_for_user_id, expires_at, created_at, last_seen_at")
    .eq("id", contextId)
    .maybeSingle();

  if (error || !context) return null;

  const nextExpiry = computeExpiry(context.created_at, now);

  const { data: updated } = await supabase
    .from("invite_contexts")
    .update({ expires_at: nextExpiry.toISOString(), last_seen_at: now.toISOString() })
    .eq("id", contextId)
    .select("id, public_id, invite_id, user_id, target_email, reserved_for_user_id, expires_at, created_at, last_seen_at")
    .maybeSingle();

  return (updated ?? context) as InviteContextRow;
}

export async function bindContextToUser(
  supabase: SupabaseClient,
  contextId: string,
  userId: string,
  userEmail: string | null
): Promise<InviteContextRow | null> {
  if (!requireVerifiedEmail(userEmail)) return null;

  const { data: context } = await supabase
    .from("invite_contexts")
    .select("id, public_id, invite_id, user_id, target_email, reserved_for_user_id, expires_at, created_at, last_seen_at")
    .eq("id", contextId)
    .maybeSingle();

  if (!context) return null;

  if (context.user_id && context.user_id !== userId) return null;

  const { data: updated } = await supabase
    .from("invite_contexts")
    .update({ user_id: userId, target_email: userEmail })
    .eq("id", contextId)
    .select("id, public_id, invite_id, user_id, target_email, reserved_for_user_id, expires_at, created_at, last_seen_at")
    .maybeSingle();

  return (updated ?? context) as InviteContextRow;
}

export async function reserveInvite(
  supabase: SupabaseClient,
  invite: CampaignInviteRow,
  userId: string,
  now: Date = new Date()
): Promise<CampaignInviteRow | null> {
  if (invite.reserved_for_user_id && invite.reserved_for_user_id !== userId) return null;

  const { data: updated } = await supabase
    .from("campaign_invites")
    .update({ reserved_for_user_id: userId, updated_at: now.toISOString() })
    .eq("id", invite.id)
    .select("id, campaign_id, role, token, expires_at, created_by, target_email, status, reserved_for_user_id, accepted_by_user_id, accepted_at, updated_at")
    .maybeSingle();

  return (updated ?? invite) as CampaignInviteRow;
}

export async function exchangeToken(
  supabase: SupabaseClient,
  token: string,
  userId: string | null,
  userEmail: string | null,
  now: Date = new Date()
): Promise<ExchangeResult> {
  const { data: invite, error } = await supabase
    .from("campaign_invites")
    .select("id, campaign_id, role, token, expires_at, created_by, target_email, status, reserved_for_user_id, accepted_by_user_id, accepted_at, updated_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return { ok: false, code: "not_found", error: "Invite not found" };
  }

  const typedInvite = invite as CampaignInviteRow;

  if (typedInvite.status === "revoked") {
    return { ok: false, code: "revoked", error: "Invite revoked" };
  }

  if (isInviteExpired(typedInvite.expires_at, now)) {
    return { ok: false, code: "expired", error: "Invite expired" };
  }

  if (typedInvite.target_email) {
    if (!requireVerifiedEmail(userEmail)) {
      return { ok: false, code: "unverified", error: "Email verification required" };
    }
    if (userEmail.toLowerCase() !== typedInvite.target_email.toLowerCase()) {
      return { ok: false, code: "email_mismatch", error: "Invite email mismatch" };
    }
  }

  if (typedInvite.reserved_for_user_id && userId && typedInvite.reserved_for_user_id !== userId) {
    return { ok: false, code: "reserved", error: "Invite reserved for another user" };
  }

  if (userId) {
    await supabase
      .from("invite_contexts")
      .update({ expires_at: now.toISOString() })
      .eq("user_id", userId)
      .gt("expires_at", now.toISOString());
  }

  const publicId = crypto.randomUUID();
  const expiresAt = computeExpiry(now, now);

  const { data: context } = await supabase
    .from("invite_contexts")
    .insert({
      public_id: publicId,
      invite_id: typedInvite.id,
      user_id: userId,
      target_email: typedInvite.target_email,
      reserved_for_user_id: userId,
      expires_at: expiresAt.toISOString(),
      last_seen_at: now.toISOString(),
    })
    .select("id, public_id, invite_id, user_id, target_email, reserved_for_user_id, expires_at, created_at, last_seen_at")
    .maybeSingle();

  if (!context) {
    return { ok: false, code: "not_found", error: "Invite context unavailable" };
  }

  return { ok: true, context: context as InviteContextRow, invite: typedInvite, publicId };
}
