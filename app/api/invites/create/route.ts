import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import type { InviteRole } from "../../../lib/invites/inviteService";

const DEFAULT_EXPIRES_HOURS = 168;
const MAX_EXPIRES_HOURS = 720;

type CreateInviteBody = {
  campaignId?: string;
  role?: InviteRole;
  expiresInHours?: number;
};

function isInviteRole(role: unknown): role is InviteRole {
  return role === "dm" || role === "player";
}

function getExpiresAt(hours: number): string {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return expiresAt.toISOString();
}

export async function POST(req: NextRequest) {
  let body: CreateInviteBody;
  try {
    body = (await req.json()) as CreateInviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.campaignId || typeof body.campaignId !== "string") {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  if (!isInviteRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const expiresInHours =
    typeof body.expiresInHours === "number" && Number.isFinite(body.expiresInHours)
      ? body.expiresInHours
      : DEFAULT_EXPIRES_HOURS;

  if (expiresInHours <= 0 || expiresInHours > MAX_EXPIRES_HOURS) {
    return NextResponse.json({ error: "Invalid expiresInHours" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = crypto.randomUUID();
  const expiresAt = getExpiresAt(expiresInHours);

  const { error } = await supabase.from("campaign_invites").insert({
    campaign_id: body.campaignId,
    role: body.role,
    token,
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  try {
    const admin = createSupabaseAdminClient();
    await admin.from("campaign_invites").delete().lt("expires_at", new Date().toISOString());
  } catch {
    // Best-effort cleanup only.
  }

  const inviteUrl = new URL("/api/invites/accept", req.nextUrl.origin);
  inviteUrl.searchParams.set("token", token);

  return NextResponse.json({
    token,
    expiresAt,
    inviteUrl: inviteUrl.toString(),
  });
}
