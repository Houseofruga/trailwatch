import { NextResponse } from "next/server";
import { readPreview } from "@/features/preview/run";
import { createServiceClient } from "@/lib/supabase/service";

// Polling for a preview that was still processing (teaser only), and the
// widget's "Join the beta" click.
export const dynamic = "force-dynamic";

const validId = (id: string) => /^[0-9a-f]{32}$/.test(id);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const result = await readPreview(createServiceClient(), id);
  if (!result) return NextResponse.json({ status: "error", message: "That preview has expired." }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

/** widget_cta_click: first click only, best-effort. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  if (validId(id)) {
    await createServiceClient().from("previews").update({ cta_clicked_at: new Date().toISOString() }).eq("id", id).is("cta_clicked_at", null);
  }
  return new NextResponse(null, { status: 204 });
}
