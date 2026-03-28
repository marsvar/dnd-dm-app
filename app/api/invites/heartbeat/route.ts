import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { extendContextTtl } from "../../../lib/invites/contextService";

const INVITE_CONTEXT_COOKIE = "invite_context";

type HeartbeatBody = {
  contextId?: string;
};

export async function POST(req: NextRequest) {
  let body: HeartbeatBody = {};
  try {
    body = (await req.json()) as HeartbeatBody;
  } catch {
    // Allow empty body; fall back to cookie.
  }

  const cookieStore = await cookies();
  const contextId = body.contextId ?? cookieStore.get(INVITE_CONTEXT_COOKIE)?.value;

  if (!contextId) {
    return NextResponse.json({ error: "Missing contextId" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const updated = await extendContextTtl(admin, contextId);

  if (!updated) {
    return NextResponse.json({ error: "Context not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, expiresAt: updated.expires_at });
}
