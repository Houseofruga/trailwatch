/** Normalize a bare domain or partial URL to a full http(s) URL so it satisfies
 *  the pageUrl schema. Empty stays empty. */
export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
