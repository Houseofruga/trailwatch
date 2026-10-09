import { describe, expect, it } from "vitest";
import { inboxEmail, inboxWording } from "./wording";

// The words Gmail read as a sale announcement in the 2026-10-09 inbox test.
const SALE_WORDS = /\b(off|sale|sales|sitewide|discount\w*|promo\w*|coupon|deal)\b|code [A-Z0-9]{3,}/i;

describe("inboxWording", () => {
  it.each([
    ["Dewlane went 25% off sitewide with code GLOW25.", "Dewlane went 25% lower across the whole store."],
    ["Their first sitewide sale since spring.", "Their first store-wide price cut since spring."],
    ["Dewlane put Night Cream on sale: $38, down from $48 (21% off).", "Dewlane cut the price of Night Cream: $38, down from $48 (21% lower)."],
    ["Sale started: Night Cream", "Price cut started: Night Cream"],
    ["Sitewide sale: 62% of products discounted, up to −30%", "Store-wide price cut: 62% of products marked down, up to −30%"],
    ["Dewlane raised its free-shipping threshold to $65.", "Dewlane raised its included shipping threshold to $65."],
    ["The category is getting promo-heavy; two competitors are discounting.", "The category is getting price-led; two competitors are cutting prices."],
  ])("%s", (before, after) => {
    expect(inboxWording(before)).toBe(after);
    expect(inboxWording(before)).not.toMatch(SALE_WORDS);
  });

  it("leaves ordinary sentences, numbers and links alone", () => {
    for (const s of [
      "Dewlane launched Night Cream at $48.",
      "Northwind Knits cut Merino Crew from $98 to $89 (-9.2%).",
      "They offer three sizes.",
      "See all 2: https://gettrailwatch.com/competitors/sale-off#move-1",
    ]) {
      expect(inboxWording(s)).toBe(s);
    }
  });

  it("rewrites an email's subject, text and visible HTML, never tags or addresses", () => {
    const email = inboxEmail({
      subject: "Dewlane put 5 products on sale",
      text: "Sale started: Night Cream\nhttps://x.test/sale",
      html: '<a href="https://x.test/sale" style="width:100%">25% off sitewide</a>',
    });
    expect(email.subject).toBe("Dewlane cut the price of 5 products");
    expect(email.text).toBe("Price cut started: Night Cream\nhttps://x.test/sale");
    expect(email.html).toBe('<a href="https://x.test/sale" style="width:100%">25% lower across the whole store</a>');
  });
});
