import { createServiceClient } from "@/lib/supabase/service";
import { verifyUnsubscribe } from "@/features/digest/unsubscribe";

// One-click unsubscribe from the weekly digest — no login required.
// GET shows a confirmation page (email clients sometimes pre-fetch links, so GET
// must not perform the action). POST performs it, which also serves Gmail/Yahoo
// one-click via the List-Unsubscribe-Post header on the email.
export const runtime = "nodejs";

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} — TrailWatch</title>
<style>
  body{margin:0;background:#f5f5f5;color:#1a1a17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e6e2da;max-width:440px;width:100%;padding:32px;text-align:center}
  h1{font-size:20px;margin:0 0 10px}
  p{font-size:14px;line-height:1.6;color:#4a4740;margin:0 0 20px}
  button{background:#9ff50a;border:1px solid #8ad800;color:#557a00;font-size:14px;font-weight:500;padding:11px 18px;cursor:pointer}
  a{color:#2563eb}
</style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function valid(request: Request): { userId: string } | null {
  const params = new URL(request.url).searchParams;
  const userId = params.get("u");
  const token = params.get("t");
  if (!userId || !token || !verifyUnsubscribe(userId, token)) return null;
  return { userId };
}

export async function GET(request: Request): Promise<Response> {
  const ok = valid(request);
  if (!ok) {
    return page(
      "Link expired",
      `<h1>This link isn't valid</h1><p>It may have expired. You can manage the weekly digest from your <a href="/settings">settings</a>.</p>`,
      400,
    );
  }
  const url = new URL(request.url);
  return page(
    "Unsubscribe",
    `<h1>Turn off the weekly digest?</h1>
     <p>You'll stop receiving the weekly competitor digest. You can turn it back on anytime in Settings.</p>
     <form method="post" action="${url.pathname}${url.search}">
       <button type="submit">Unsubscribe me</button>
     </form>`,
  );
}

export async function POST(request: Request): Promise<Response> {
  const ok = valid(request);
  if (!ok) {
    return page(
      "Link expired",
      `<h1>This link isn't valid</h1><p>You can manage the weekly digest from your <a href="/settings">settings</a>.</p>`,
      400,
    );
  }

  const service = createServiceClient();
  const { error } = await service
    .from("users")
    .update({ digest_enabled: false })
    .eq("id", ok.userId);

  if (error) {
    console.error("Unsubscribe update failed:", error);
    return page(
      "Something went wrong",
      `<h1>We couldn't update that</h1><p>Please try again, or turn off the digest from your <a href="/settings">settings</a>.</p>`,
      500,
    );
  }

  return page(
    "Unsubscribed",
    `<h1>You're unsubscribed</h1><p>You won't get the weekly digest anymore. Changed your mind? Turn it back on in <a href="/settings">settings</a>.</p>`,
  );
}
