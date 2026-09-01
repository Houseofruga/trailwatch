import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Landing point for EMAIL links: password recovery, signup confirmation, email
// change. Unlike the OAuth PKCE code flow at /auth/callback, verifyOtp with a
// token_hash works even when the link is opened on a different device or browser
// than the one that requested it — which is the norm for reset/confirm emails
// (request on a laptop, open on a phone). `next` forwards recovery to
// /reset-password; anything else defaults to the dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  const dest =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }

  return NextResponse.redirect(`${origin}${dest}`);
}
