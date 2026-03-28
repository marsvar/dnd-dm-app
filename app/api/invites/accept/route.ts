import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import {
  getAllowedRedirectOrigins,
  isInviteExpired,
  resolveMembershipConflict,
  validateRedirectTarget,
  type InviteRole,
} from "../../../lib/invites/inviteService";

type CampaignInvite = {
  id: string;
  campaign_id: string;
  role: InviteRole;
  token: string;
  expires_at: string;
  created_by: string;
};

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const redirect = req.nextUrl.searchParams.get("redirect");

  const allowedOrigins = [...getAllowedRedirectOrigins(), req.nextUrl.origin];
  const redirectResult = validateRedirectTarget(redirect, allowedOrigins);
  if (!redirectResult.ok) {
    return NextResponse.json({ error: redirectResult.error }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  await admin.from("campaign_invites").delete().lt("expires_at", new Date().toISOString());

  const { data: invite, error } = await admin
    .from("campaign_invites")
    .select("id, campaign_id, role, token, expires_at, created_by")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const typedInvite = invite as CampaignInvite;

  if (isInviteExpired(typedInvite.expires_at)) {
    await admin.from("campaign_invites").delete().eq("id", typedInvite.id);
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const { data: existingMember, error: memberError } = await admin
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", typedInvite.campaign_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const conflictAction = resolveMembershipConflict(
    existingMember?.role ?? null,
    typedInvite.role
  );

  if (conflictAction === "conflict") {
    return NextResponse.json({ error: "Role conflict" }, { status: 409 });
  }

  if (conflictAction === "insert") {
    const { error: insertError } = await admin.from("campaign_members").insert({
      campaign_id: typedInvite.campaign_id,
      user_id: user.id,
      role: typedInvite.role,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  await admin.from("campaign_invites").delete().eq("id", typedInvite.id);

  const redirectTo = new URL(redirectResult.redirectTo, req.nextUrl.origin);
  return NextResponse.redirect(redirectTo);
}
