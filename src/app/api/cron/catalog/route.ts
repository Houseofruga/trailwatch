import { NextResponse } from "next/server";
import { runAlertSender } from "@/features/alerts/sendAlerts";
import { runBriefingStep } from "@/features/briefing/run";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { runCatalogTick } from "@/features/catalog/schedule";
import { createServiceClient } from "@/lib/supabase/service";

// The pivot's heartbeat, called every ~10 min by Supabase pg_cron (see
// supabase/setup/pg_cron_catalog.sql) — Vercel Cron is daily-only on our plan.
// Each call, in order:
//   1. send due instant alerts (quick; events from earlier ticks)
//   2. advance the Monday briefing (time-gated, US Eastern; usually a no-op)
//   3. check due stores with whatever time is left
// Same CRON_SECRET guard as the other cron routes.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  // Fail closed: without a secret anyone could trigger crawls and sends.
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run the tick.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const service = createServiceClient();

  // A failure in one stage mustn't stop the others.
  const alerts = await runAlertSender(service).catch((err) => ({ error: String(err) }));
  const briefing = await runBriefingStep(service).catch((err) => ({ error: String(err) }));
  const checks = await runCatalogTick(Math.max(0, CATALOG_CONFIG.tickBudgetMs - (Date.now() - started)));

  return NextResponse.json({ ok: true, alerts, briefing, checks });
}
