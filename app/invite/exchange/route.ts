import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServerClient } from "../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { exchangeToken, INVITE_TTL_MINUTES } from "../../lib/invites/contextService";

const CSRF_COOKIE = "invite_csrf";
const INVITE_CONTEXT_COOKIE = "invite_context";
const NONCE_SECRET =
  process.env.INVITE_NONCE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

type ExchangeBody = {
  token?: string;
  csrf?: string;
  nonce?: string;
  nonceSig?: string;
};

function signNonce(nonce: string): string {
  return createHmac("sha256", NONCE_SECRET).update(nonce).digest("hex");
}

function verifyNonce(nonce?: string, nonceSig?: string): boolean {
  if (!nonce || !nonceSig || !NONCE_SECRET) return false;
  const expected = signNonce(nonce);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(nonceSig));
}

function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return origin === req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  let body: ExchangeBody;
  try {
    body = (await req.json()) as ExchangeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get(CSRF_COOKIE)?.value ?? null;
  const hasCsrf = csrfCookie && body.csrf && csrfCookie === body.csrf;
  const hasNonce = verifyNonce(body.nonce, body.nonceSig);

  if (!hasCsrf && !hasNonce) {
    return NextResponse.json({ error: "Invalid CSRF" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const result = await exchangeToken(admin, body.token, user.id, user.email ?? null);

  if (!result.ok) {
    const status = result.code === "expired" ? 410 : 400;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, name, description")
    .eq("id", result.invite.campaign_id)
    .maybeSingle();

  const res = NextResponse.json({
    publicId: result.publicId,
    contextId: result.context.id,
    summary: campaign ?? null,
  });

  res.cookies.set(INVITE_CONTEXT_COOKIE, result.context.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: INVITE_TTL_MINUTES * 60,
  });

  return res;
}
