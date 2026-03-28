import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { isConflictStatus } from "../../../lib/invites/inviteRpc";

const INVITE_CONTEXT_COOKIE = "invite_context";

type CreatePcBody = {
  mode?: "invite" | "normal";
  actionId?: string;
  payload?: Record<string, unknown>;
  contextId?: string;
  campaignId?: string;
  allowNew?: boolean;
};

function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  return Boolean(origin && origin === req.nextUrl.origin);
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  let body: CreatePcBody;
  try {
    body = (await req.json()) as CreatePcBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const actionId = body.actionId;
  if (!actionId) {
    return NextResponse.json({ error: "Missing actionId" }, { status: 400 });
  }

  const mode = body.mode ?? "invite";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const contextId =
    body.contextId ?? cookieStore.get(INVITE_CONTEXT_COOKIE)?.value ?? null;

  if (mode === "invite" && !contextId) {
    return NextResponse.json({ error: "Missing invite context" }, { status: 400 });
  }

  if (mode === "normal" && !body.campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("create_invite_pc", {
    p_mode: mode,
    p_action_id: actionId,
    p_payload: body.payload ?? {},
    p_user_id: user.id,
    p_context_id: mode === "invite" ? contextId : null,
    p_campaign_id: mode === "normal" ? body.campaignId : null,
    p_allow_new: Boolean(body.allowNew),
  });

  if (error) {
    const status = error.code === "42501" ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json({ error: "No response from create" }, { status: 500 });
  }

  if (isConflictStatus(result.status)) {
    return NextResponse.json({ error: "Newer attempt detected", conflict: true }, { status: 409 });
  }

  if (result.status === "invalid_context" || result.status === "invite_revoked") {
    return NextResponse.json({ error: "Invite invalid" }, { status: 410 });
  }

  if (result.status === "invite_reserved" || result.status === "context_bound") {
    return NextResponse.json({ error: "Invite reserved" }, { status: 409 });
  }

  return NextResponse.json({
    pcId: result.pc_id ?? null,
    status: result.status,
    inviteId: result.invite_id ?? null,
  });
}
