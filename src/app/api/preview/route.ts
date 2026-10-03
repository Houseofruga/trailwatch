import { after, NextResponse } from "next/server";
import { lookupPreview } from "@/features/preview/run";
import { createServiceClient } from "@/lib/supabase/service";

// Homepage "Try it on a competitor": POST { domain } → teaser or a preview id to poll.
// Public; rate limits, the daily cap and caching live in lookupPreview.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clientIp(request: Request): string {
  const h = request.headers;
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request): Promise<Response> {
  let domain: unknown;
  try {
    domain = ((await request.json()) as { domain?: unknown }).domain;
  } catch {
    domain = null;
  }
  const result = await lookupPreview(createServiceClient(), typeof domain === "string" ? domain : "", clientIp(request), (work) => after(work));
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
