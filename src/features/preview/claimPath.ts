// Carrying a homepage preview through sign-up (widget prompt Part 3). Pure and
// dependency-free, so the auth form (client) and the auth actions (server) agree.

const PREVIEW_ID = /^[0-9a-f]{32}$/;
const DOMAIN = /^[a-z0-9.-]{1,253}$/i;

/** /claim?preview=…&domain=… for whatever is valid, or undefined. */
export function claimPathFor(previewId: string | null | undefined, domain: string | null | undefined): string | undefined {
  const qs = new URLSearchParams();
  if (previewId && PREVIEW_ID.test(previewId)) qs.set("preview", previewId);
  if (domain && DOMAIN.test(domain)) qs.set("domain", domain);
  return qs.size > 0 ? `/claim?${qs}` : undefined;
}

/** A post-auth destination we'll honour: only our own /claim link (no open redirects). */
export function claimNext(raw: unknown): string | null {
  return typeof raw === "string" && /^\/claim\?[\w=&%.-]{1,300}$/.test(raw) ? raw : null;
}

/** Did they type the store they just added as a competitor? ("Is this your store?") */
export function sameStore(typed: string, competitorDomain: string): boolean {
  const host = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#:]/)[0];
  const a = host(typed);
  return a.includes(".") && a === host(competitorDomain);
}
