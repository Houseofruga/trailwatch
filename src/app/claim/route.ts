import { NextResponse, type NextRequest } from "next/server";
import { claimPreview } from "@/features/preview/claim";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// Where sign-up (email, Google, confirmation link) and a signed-in click on the
// homepage widget land: /claim?preview=<id>[&domain=<store>]. Adds the
// competitor, then opens widget onboarding for a new account, or that
// competitor's snapshot for an existing one.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = request.nextUrl;
  const previewId = searchParams.get("preview");
  const domain = searchParams.get("domain");
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const qs = new URLSearchParams({ mode: "signup" });
    if (previewId) qs.set("preview", previewId);
    if (domain) qs.set("domain", domain);
    return go(`/login?${qs}`);
  }

  const result = await claimPreview(supabase, createServiceClient(), user.id, previewId, domain);
  if (!result.ok) return go(result.firstCompetitor ? "/welcome" : "/dashboard");
  return go(result.firstCompetitor ? `/welcome/widget?c=${result.competitorId}` : `/competitors/${result.competitorId}/report`);
}
