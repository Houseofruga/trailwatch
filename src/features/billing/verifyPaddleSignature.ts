import { createHmac, timingSafeEqual } from "node:crypto";

// Paddle signs webhooks with an HMAC-SHA256 over `${ts}:${rawBody}`, sent in the
// `Paddle-Signature` header as `ts=<unix>;h1=<hex>`. We verify it ourselves (a
// few lines) so the webhook route can feed the raw snake_case JSON straight to
// the pure resolver, and so this check is unit-testable without the SDK.

// Reject stale timestamps to blunt replay attacks (5 minutes, Paddle's default).
const MAX_AGE_SECONDS = 5 * 60;

function parseHeader(header: string): { ts: string; h1: string } | null {
  const parts = Object.fromEntries(
    header.split(";").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  if (!parts.ts || !parts.h1) return null;
  return { ts: parts.ts, h1: parts.h1 };
}

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader) return false;
  const parsed = parseHeader(signatureHeader);
  if (!parsed) return false;

  const ts = Number(parsed.ts);
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${parsed.ts}:${rawBody}`).digest("hex");

  // Constant-time compare; timingSafeEqual throws on length mismatch, so guard.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.h1, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
