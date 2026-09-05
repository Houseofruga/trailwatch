import { NextResponse } from "next/server";
import { runDailyChecks } from "@/features/checks/runDailyChecks";

// Daily check cron target (SPEC.md F3, slice 7). Scheduled in vercel.json. Guard
// is the shared CRON_SECRET — Vercel Cron sends it as a Bearer token so the
// endpoint can't be triggered by anyone who finds the URL.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  // Fail closed: with no secret configured the endpoint would be world-triggerable
  // (anyone could burn LLM/spend by hammering the check job), so refuse to run.
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run the check job.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runDailyChecks();
  return NextResponse.json({ ok: true, ...result });
}
