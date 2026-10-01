import { parse } from "tldts";
import disposableDomains from "disposable-email-domains/index.json";

// Light trust signals at sign-up, without adding friction for real founders
// (many run their brand from Gmail, so a company email is never required).

let disposable: Set<string> | null = null;

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  const domain = at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

/** A throwaway inbox (mailinator, temp-mail...), including its subdomains. Open-source list, loaded once. */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  disposable ??= new Set(disposableDomains as string[]);
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (disposable.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

/** "Verified brand": the sign-up email is on the same site as the store they say is theirs. */
export function emailMatchesStore(email: string, storeDomain: string | null | undefined): boolean {
  const domain = emailDomain(email);
  if (!domain || !storeDomain) return false;
  const a = parse(domain).domain;
  const b = parse(storeDomain).domain;
  return !!a && a === b;
}
