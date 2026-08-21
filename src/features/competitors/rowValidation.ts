// Shared between AddForm.tsx (new-competitor creation) and AddPageDialog.tsx
// (adding pages to an existing competitor) — both render a list of URL rows
// with the same live format + one-domain-per-competitor validation.

import { siteOf } from "./domain";
import { pageUrl } from "./validation";

export function formatUrlError(url: string): string | null {
  if (!url.trim()) return null; // blank rows aren't errors, just unused slots
  const result = pageUrl.safeParse(url);
  return result.success ? null : result.error.issues[0].message;
}

// Pages under one competitor must share a registrable domain — subdomains of the
// same site (www., docs., app.) are fine, other domains aren't. `established`
// can be a URL or a bare domain; we compare the sites of both.
export function domainMismatchError(url: string, established: string | null): string | null {
  if (!url.trim() || !established) return null;
  const site = siteOf(established);
  if (!site) return null; // can't derive a site to compare against
  if (siteOf(url) === site) return null;
  return `Must be on ${site} — add a separate competitor for other domains.`;
}
