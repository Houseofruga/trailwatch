import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaddleSignature } from "./verifyPaddleSignature";

const SECRET = "pdl_ntfset_test_secret";
const body = JSON.stringify({ event_type: "subscription.activated", data: { id: "sub_1" } });

function sign(rawBody: string, ts: number, secret = SECRET): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleSignature", () => {
  const now = 1_700_000_000;

  it("accepts a correctly-signed, fresh payload", () => {
    expect(verifyPaddleSignature(body, sign(body, now), SECRET, now)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body, now);
    expect(verifyPaddleSignature(body + "x", sig, SECRET, now)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifyPaddleSignature(body, sign(body, now, "other"), SECRET, now)).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const stale = now - 10 * 60;
    expect(verifyPaddleSignature(body, sign(body, stale), SECRET, now)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyPaddleSignature(body, null, SECRET, now)).toBe(false);
    expect(verifyPaddleSignature(body, "garbage", SECRET, now)).toBe(false);
  });
});
