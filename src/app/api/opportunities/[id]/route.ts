import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpportunity, hasOpportunities, setOpportunityStatus } from "@/features/opportunities/queries";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// One opportunity with its evidence (GET), and the user's verdict on it (POST
// {"action": "dismiss" | "not_relevant" | "restore"}).
export const dynamic = "force-dynamic";

const uuid = z.string().uuid();
const body = z.object({ action: z.enum(["dismiss", "not_relevant", "restore"]) });

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  if (!(await hasOpportunities(supabase, user.id))) {
    return { ok: false as const, response: NextResponse.json({ error: "Opportunities are part of Pro." }, { status: 403 }) };
  }
  return { ok: true as const, supabase, user };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const auth = await signedIn();
  if (!auth.ok) return auth.response;
  const found = uuid.safeParse(id).success ? await getOpportunity(auth.supabase, auth.user.id, id) : null;
  if (!found) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ opportunity: found }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const auth = await signedIn();
  if (!auth.ok) return auth.response;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!uuid.safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const ok = await setOpportunityStatus(createServiceClient(), auth.user.id, id, parsed.data.action);
  if (!ok) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
