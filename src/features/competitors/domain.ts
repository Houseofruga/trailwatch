// Shared by the add flow (one domain per competitor) and the edit page
// (previewing/rewriting every page's URL against a shared domain field).

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// Accepts a bare domain ("vercel.com") or a full URL — the edit page's
// domain field shouldn't force users to type "https://".
export function normalizeDomainInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = originOf(trimmed);
  if (direct) return direct;

  return originOf(`https://${trimmed}`);
}

export function sameOrigin(urlA: string, urlB: string): boolean {
  const a = originOf(urlA);
  const b = originOf(urlB);
  return a !== null && a === b;
}
