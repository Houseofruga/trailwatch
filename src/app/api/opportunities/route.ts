import { NextResponse } from "next/server";
import { hasOpportunities, listOpportunities } from "@/features/opportunities/queries";
import { createClient } from "@/lib/supabase/server";

// Opportunities for the signed-in user (B4): open ones strongest first, or
// every status with ?status=all. Each carries its evidence.
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await hasOpportunities(supabase, user.id))) {
    return NextResponse.json({ error: "Opportunities are part of Pro." }, { status: 403 });
  }
  const all = new URL(request.url).searchParams.get("status") === "all";
  const opportunities = await listOpportunities(supabase, user.id, { all });
  return NextResponse.json({ opportunities }, { headers: { "Cache-Control": "no-store" } });
}
