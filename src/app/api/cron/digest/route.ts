import { NextResponse } from "next/server";
import { runWeeklyDigest } from "@/features/digest/run";

// Weekly digest cron target (SPEC.md F6). Scheduled in vercel.json. Vercel Cron
// sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set — we
// require it so the endpoint can't be triggered by anyone who finds the URL.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runWeeklyDigest();
  return NextResponse.json({ ok: true, ...result });
}
