import { NextResponse } from "next/server";
import { runDailyChecks } from "@/features/checks/runDailyChecks";

// Daily check cron target (SPEC.md F3, slice 7). Scheduled in vercel.json. Guard
// is the shared CRON_SECRET — Vercel Cron sends it as a Bearer token so the
// endpoint can't be triggered by anyone who finds the URL.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDailyChecks();
  return NextResponse.json({ ok: true, ...result });
}
