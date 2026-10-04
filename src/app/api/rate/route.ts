import { NextResponse } from "next/server";
import { z } from "zod";
import { saveRating, verifyRating } from "@/features/beta/ratings";
import { createServiceClient } from "@/lib/supabase/service";

// Saves a one-click rating from an email (beta). POST only: the /rate page
// calls it from the browser, so link-scanning email clients that only fetch
// the page can't leave ratings.
export const dynamic = "force-dynamic";

const body = z.object({
  u: z.string().uuid(),
  k: z.enum(["briefing", "alert"]),
  i: z.string().uuid(),
  v: z.enum(["useful", "not_useful"]),
  t: z.string().min(10).max(200),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { u, k, i, v, t, comment } = parsed.data;
  const claim = { userId: u, target: k, id: i, value: v } as const;
  if (!verifyRating(claim, t)) return NextResponse.json({ ok: false }, { status: 403 });
  const ok = await saveRating(createServiceClient(), claim, comment?.trim() || undefined);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
