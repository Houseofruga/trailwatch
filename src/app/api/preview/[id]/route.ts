import { NextResponse } from "next/server";
import { readPreview } from "@/features/preview/run";
import { createServiceClient } from "@/lib/supabase/service";

// Polling for a preview that was still processing. Returns the teaser only.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const result = await readPreview(createServiceClient(), id);
  if (!result) return NextResponse.json({ status: "error", message: "That preview has expired." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
