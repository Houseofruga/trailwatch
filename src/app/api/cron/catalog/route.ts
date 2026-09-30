import { NextResponse } from "next/server";
import { runCatalogTick } from "@/features/catalog/schedule";

// Catalog tick (pivot Phase 2). Called every ~10 min by Supabase pg_cron (see
// supabase/setup/pg_cron_catalog.sql) — Vercel Cron is daily-only on our plan.
// Each call checks whichever stores are due; same CRON_SECRET guard as the
// other cron routes.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  // Fail closed: without a secret anyone could trigger crawls.
  if (!secret) {
    console.error("CRON_SECRET is not set — refusing to run the catalog tick.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCatalogTick();
  return NextResponse.json({ ok: true, ...result });
}
