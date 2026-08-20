// Shared by the add flow (locking a competitor's pages to one domain) and
// the edit flow (fixing that domain later, cascading to every page).

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Accepts a bare domain ("vercel.com") or a full URL — the edit dialog's
// domain field shouldn't force users to type "https://".
export function normalizeDomainInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = originOf(trimmed);
  if (direct) return direct;

  return originOf(`https://${trimmed}`);
}

// Swaps the scheme+host on `url` for `newOrigin`'s, keeping the original's
// path/query/hash intact — this is what makes a domain-typo fix cheap.
export function replaceUrlHost(url: string, newOrigin: string): string {
  const target = new URL(url);
  const next = new URL(newOrigin);
  target.protocol = next.protocol;
  target.host = next.host;
  return target.toString();
}
