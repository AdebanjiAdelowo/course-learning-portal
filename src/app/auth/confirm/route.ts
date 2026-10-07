import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/supabase/session";

const EMAIL_LINK_TYPES: readonly EmailOtpType[] = ["recovery", "invite", "email", "magiclink", "signup"];

/**
 * Landing point for links in auth emails (password reset, invitation). Exchanges the one-time
 * token for a session cookie, then forwards to `next` (same-site paths only).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/learn/update-password");

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && EMAIL_LINK_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, request.url));

  const failed = new URL("/learn/forgot-password", request.url);
  failed.searchParams.set("error", "expired");
  return NextResponse.redirect(failed);
}
