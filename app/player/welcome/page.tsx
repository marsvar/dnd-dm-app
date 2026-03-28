import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import WelcomeClient from "./WelcomeClient";

const CSRF_COOKIE = "invite_csrf";
const NONCE_SECRET =
  process.env.INVITE_NONCE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function signNonce(nonce: string): string {
  return createHmac("sha256", NONCE_SECRET).update(nonce).digest("hex");
}

export default async function PlayerWelcomePage() {
  const cookieStore = await cookies();
  const csrf = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  const nonceSig = signNonce(nonce);

  cookieStore.set(CSRF_COOKIE, csrf, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return <WelcomeClient csrf={csrf} nonce={nonce} nonceSig={nonceSig} />;
}
