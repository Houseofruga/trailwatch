// Shared between AddForm.tsx (new-competitor creation) and AddPageDialog.tsx
// (adding pages to an existing competitor) — both render a list of URL rows
// with the same live format + one-domain-per-competitor validation.

import { originOf } from "./domain";
import { pageUrl } from "./validation";

export function formatUrlError(url: string): string | null {
  if (!url.trim()) return null; // blank rows aren't errors, just unused slots
  const result = pageUrl.safeParse(url);
  return result.success ? null : result.error.issues[0].message;
}

export function domainMismatchError(url: string, establishedOrigin: string | null): string | null {
  if (!url.trim() || !establishedOrigin) return null;
  if (originOf(url) === establishedOrigin) return null;
  return `Must be on ${establishedOrigin.replace(/^https?:\/\//, "")} — add a separate competitor for other domains.`;
}
