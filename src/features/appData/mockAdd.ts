// Client-side stand-in for addCompetitorByDomain during UI Step 5, so the add
// forms show every designed error. Step 6 calls the real server action, which
// returns these same messages.

import { parse } from "tldts";
import { isMarketplace, MARKETPLACE_MESSAGE } from "@/features/stores/denylist.config";

export const ADD_MESSAGES = {
  invalid: "Enter a website like dewlane.com.",
  marketplace: MARKETPLACE_MESSAGE,
  unreachable: "We couldn't open that site. Check the address, or try their main domain.",
  own: "That's your store. Add a competitor's instead.",
  duplicate: (name: string) => `You've already added ${name}.`,
};

export type AddCheck = { ok: true; host: string; name: string } | { ok: false; error: string };

/** Mock rules: "*.co" hosts stand in for unreachable sites so that state is reachable. */
export function checkStoreInput(
  input: string,
  ctx: { ownDomain?: string | null; existing: { name: string; domain: string }[] },
): AddCheck {
  const raw = input.trim().replace(/^https?:\/\//i, "");
  const { hostname, domain, domainWithoutSuffix, isIp } = parse(raw);
  if (!raw || !hostname || !domain || isIp || !raw.includes(".")) return { ok: false, error: ADD_MESSAGES.invalid };
  if (isMarketplace(raw)) return { ok: false, error: ADD_MESSAGES.marketplace };
  const host = hostname.toLowerCase().replace(/^www\./, "");
  if (ctx.ownDomain && host === ctx.ownDomain) return { ok: false, error: ADD_MESSAGES.own };
  const dup = ctx.existing.find((c) => c.domain === host);
  if (dup) return { ok: false, error: ADD_MESSAGES.duplicate(dup.name) };
  if (host.endsWith(".co")) return { ok: false, error: ADD_MESSAGES.unreachable };
  const brand = domainWithoutSuffix || host;
  return { ok: true, host, name: brand.charAt(0).toUpperCase() + brand.slice(1) };
}
