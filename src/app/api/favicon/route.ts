import { fetchFavicon } from "@/features/favicon/fetchFavicon";

// First-party favicon proxy. The dashboard/board render competitor logos via
// <img src="/api/favicon?domain=…">, so a competitor's domain (and the viewer's
// IP) never go to a third-party icon service — only our server fetches it, and
// the result is cached hard at the edge.
export const runtime = "nodejs";
export const maxDuration = 15;

// A valid-looking hostname: labels of letters/digits/hyphens, a dot, a TLD.
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,}$/i;

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("domain")?.trim().toLowerCase();
  if (!raw || !HOSTNAME.test(raw)) {
    return new Response(null, { status: 400 });
  }

  const icon = await fetchFavicon(raw);

  if (!icon) {
    // No icon found → 404 so the client <img>'s onError fires and the avatar
    // falls back to initials. Cache the miss briefly so a dead domain isn't
    // re-fetched on every render.
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  }

  return new Response(icon.bytes as BodyInit, {
    headers: {
      "Content-Type": icon.contentType,
      "X-Content-Type-Options": "nosniff",
      // Favicons rarely change — cache a week at the edge, serve stale while revalidating.
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
    },
  });
}
