import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

type RecoveryAttempt = {
  id: string;
  pcId: string;
  pcName: string;
  campaignId: string;
  campaignName: string;
  acceptedAt: string | null;
  updatedAt: string;
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: attempts, error } = await admin
    .from("invite_action_attempts")
    .select("id, pc_id, status, accepted_at, updated_at, context_id")
    .eq("user_id", user.id)
    .eq("status", "needs_assignment")
    .order("accepted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!attempts || attempts.length === 0) {
    return NextResponse.json({ attempts: [] });
  }

  const pcIds = attempts.map((attempt) => attempt.pc_id);
  const contextIds = attempts.map((attempt) => attempt.context_id);

  const { data: pcs } = await admin
    .from("pcs")
    .select("id, name, campaign_id")
    .in("id", pcIds);

  const { data: contexts } = await admin
    .from("invite_contexts")
    .select("id, invite_id")
    .in("id", contextIds);

  const inviteIds = (contexts ?? []).map((context) => context.invite_id);
  const { data: invites } = await admin
    .from("campaign_invites")
    .select("id, campaign_id")
    .in("id", inviteIds);

  const campaignIds = Array.from(
    new Set([
      ...(pcs ?? []).map((pc) => pc.campaign_id),
      ...(invites ?? []).map((invite) => invite.campaign_id),
    ])
  );

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name")
    .in("id", campaignIds);

  const pcById = new Map((pcs ?? []).map((pc) => [pc.id, pc] as const));
  const inviteById = new Map((invites ?? []).map((invite) => [invite.id, invite] as const));
  const campaignById = new Map((campaigns ?? []).map((campaign) => [campaign.id, campaign] as const));
  const inviteByContext = new Map(
    (contexts ?? []).map((context) => [context.id, context.invite_id] as const)
  );

  const payload: RecoveryAttempt[] = attempts.map((attempt) => {
    const pc = pcById.get(attempt.pc_id);
    const inviteId = inviteByContext.get(attempt.context_id);
    const invite = inviteId ? inviteById.get(inviteId) : null;
    const campaignId = pc?.campaign_id ?? invite?.campaign_id ?? "";
    const campaignName = campaignById.get(campaignId)?.name ?? "";
    return {
      id: attempt.id,
      pcId: attempt.pc_id,
      pcName: pc?.name ?? "Unknown PC",
      campaignId,
      campaignName,
      acceptedAt: attempt.accepted_at,
      updatedAt: attempt.updated_at,
    };
  });

  return NextResponse.json({ attempts: payload });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { attemptId?: string };
  try {
    body = (await req.json()) as { attemptId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.attemptId) {
    return NextResponse.json({ error: "Missing attemptId" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: attempt, error } = await admin
    .from("invite_action_attempts")
    .select("id, pc_id, context_id, status")
    .eq("id", body.attemptId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.status !== "needs_assignment") {
    return NextResponse.json({ error: "Attempt already resolved" }, { status: 409 });
  }

  const { data: pc } = await admin
    .from("pcs")
    .select("id, campaign_id")
    .eq("id", attempt.pc_id)
    .maybeSingle();

  if (!pc) {
    return NextResponse.json({ error: "PC not found" }, { status: 404 });
  }

  const { error: assignmentError } = await admin.from("pc_assignments").insert({
    pc_id: pc.id,
    user_id: user.id,
    campaign_id: pc.campaign_id,
  });

  if (assignmentError && assignmentError.code !== "23505") {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  await admin
    .from("invite_action_attempts")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", attempt.id);

  const { data: context } = await admin
    .from("invite_contexts")
    .select("invite_id")
    .eq("id", attempt.context_id)
    .maybeSingle();

  if (context?.invite_id) {
    await admin
      .from("campaign_invites")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", context.invite_id);
  }

  return NextResponse.json({ ok: true });
}
