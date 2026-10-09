// Inbox wording. Gmail files mail under Promotions when it reads like a sale
// announcement, and a briefing about competitors' sales is full of that
// vocabulary. Tested 2026-10-09 with the same email to fresh inboxes: with
// "25% off sitewide with code GLOW25" it went to Promotions; with "cut prices
// 25% across the whole store" it went to Primary. Swapping % and $ for words
// made no difference. So emails say the same facts in neutral words; the app
// keeps the exact wording.

type Rule = [RegExp, string];

// Order matters: specific phrases before the single words inside them.
const RULES: Rule[] = [
  // Coupon codes never go in an email ("with code GLOW25").
  [/\s*,?\s*(?:[Ww]ith|[Uu]sing|[Vv]ia|[Uu]se)\s+(?:the\s+)?(?:promo(?:tional)?\s+|coupon\s+|discount\s+)?code\s+[A-Z][A-Z0-9]{2,}\b/g, ""],
  [/\b(?:promo(?:tional)?|coupon|discount)\s+codes?\b/gi, "checkout codes"],
  [/\b(\d+(?:\.\d+)?)\s?%[\s-]off\b/gi, "$1% lower"],
  [/\bsite[\s-]?wide sales?\b/gi, "store-wide price cut"],
  [/\bsite[\s-]?wide\b/gi, "across the whole store"],
  [/\bput (.+?) on sale\b/gi, "cut the price of $1"],
  [/\bon sale\b/gi, "at a lower price"],
  [/\bsales\b/gi, "price cuts"],
  [/\bsale\b/gi, "price cut"],
  [/\bfree[\s-](shipping|returns|delivery)\b/gi, "included $1"],
  [/\bdiscounted\b/gi, "marked down"],
  [/\bdiscounting\b/gi, "cutting prices"],
  [/\bdiscounts\b/gi, "price cuts"],
  [/\bdiscount\b/gi, "price cut"],
  [/\bpromo-heavy\b/gi, "price-led"],
  [/\bpromo(?:tion)?s\b/gi, "price pushes"],
  [/\bpromo(?:tion)?\b/gi, "price push"],
  [/\bcounter-offer\b/gi, "response"],
  [/\b(an?|the|their|its|your|this|that|early-access|limited-time)\s+offer\b/gi, "$1 invitation"],
  [/\bcoupons?\b/gi, "price cut"],
  [/\bdeals\b/gi, "price cuts"],
  [/\bdeal\b/gi, "price cut"],
];

const startsUpper = (s: string) => /^[A-Z]/.test(s.trimStart());
const capitalize = (s: string) => s.replace(/[a-z]/, (c) => c.toUpperCase());

function rewrite(text: string): string {
  let out = text;
  for (const [pattern, replacement] of RULES) {
    out = out.replace(pattern, (match, ...groups) => {
      const filled = replacement.replace(/\$(\d)/g, (_, i) => String(groups[Number(i) - 1] ?? ""));
      // "Sale started" → "Price cut started": keep a leading capital.
      return startsUpper(match) && !startsUpper(filled) && !/^\$?\d/.test(filled) ? capitalize(filled) : filled;
    });
  }
  return out;
}

/** The same sentence in words that don't read as a sale announcement. Links are left alone. */
export function inboxWording(text: string): string {
  return text
    .split(/(https?:\/\/\S+)/)
    .map((part) => (/^https?:\/\//.test(part) ? part : rewrite(part)))
    .join("");
}

/** A whole email: subject, text, and the HTML's visible text (never tags or addresses). */
export function inboxEmail<T extends { subject: string; html: string; text: string }>(email: T): T {
  const html = email.html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith("<") ? part : rewrite(part)))
    .join("");
  return { ...email, subject: inboxWording(email.subject), text: inboxWording(email.text), html };
}
