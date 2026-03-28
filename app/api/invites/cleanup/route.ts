import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export async function POST() {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { count, error } = await admin
    .from("invite_contexts")
    .delete({ count: "exact" })
    .lt("expires_at", now);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.info(`[invite-cleanup] expired_contexts=${count ?? 0}`);
  return NextResponse.json({ ok: true, expiredCount: count ?? 0 });
}
