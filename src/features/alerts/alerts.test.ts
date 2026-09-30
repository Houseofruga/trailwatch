import { describe, expect, it } from "vitest";
import { describeEvent, leadEvent, suggestedAction } from "./describe";
import { renderAlertEmail, renderAlertSlack, type AlertBundle } from "./render";
import { isSlackWebhookUrl } from "./slack";

describe("describeEvent", () => {
  it("states every catalog event plainly, with its numbers", () => {
    const s = "Dewlane";
    expect(describeEvent("product_launched", { title: "Night Cream", price: 4800 }, s)).toBe(
      "Dewlane launched Night Cream at $48.",
    );
    expect(describeEvent("product_removed", { title: "Old Toner" }, s)).toBe("Dewlane removed Old Toner from its store.");
    expect(describeEvent("price_changed", { title: "Merino Crew", oldPrice: 9800, newPrice: 8900, pctChange: -9.2 }, s)).toBe(
      "Dewlane cut Merino Crew from $98 to $89 (-9.2%).",
    );
    expect(describeEvent("price_changed", { title: "Serum", oldPrice: 3000, newPrice: 3450, pctChange: 15 }, s)).toBe(
      "Dewlane raised Serum from $30 to $34.50 (+15%).",
    );
    expect(describeEvent("sale_started", { title: "Balm", salePrice: 3600, compareAtPrice: 4800, pctOff: 25 }, s)).toBe(
      "Dewlane put Balm on sale: $36, down from $48 (25% off).",
    );
    expect(describeEvent("sale_ended", { title: "Balm", newPrice: 4800 }, s)).toBe("Dewlane ended the sale on Balm (back to $48).");
    expect(describeEvent("sold_out", { title: "Daily Greens" }, s)).toBe("Dewlane's Daily Greens sold out.");
    expect(describeEvent("restocked", { title: "Gummies" }, s)).toBe("Dewlane restocked Gummies.");
    expect(
      describeEvent("sitewide_sale_detected", { productsDiscounted: 71, shareDiscounted: 64, avgPctOff: 24 }, s),
    ).toBe("Dewlane is running a sitewide sale: 71 products newly discounted, 64% of what's in stock, 24% off on average.");
  });

  it("uses the classifier summary for page events, with a fallback", () => {
    expect(describeEvent("promo_launched", { summary: "Dewlane started 25% off with code GLOW25." }, "Dewlane")).toBe(
      "Dewlane started 25% off with code GLOW25.",
    );
    expect(describeEvent("policy_change", { pageKind: "shipping_policy" }, "Dewlane")).toBe(
      "Dewlane changed its shipping policy.",
    );
  });

  it("degrades gracefully on missing numbers", () => {
    expect(describeEvent("price_changed", { title: "X" }, "D")).toBe("D changed the price of X.");
    expect(describeEvent("product_launched", {}, "D")).toBe("D launched a product.");
  });
});

describe("leadEvent / suggestedAction", () => {
  it("leads a bundle with the biggest move", () => {
    const events = [{ type: "product_launched" as const }, { type: "sitewide_sale_detected" as const }, { type: "sold_out" as const }];
    expect(leadEvent(events).type).toBe("sitewide_sale_detected");
  });

  it("gives a concrete, type-specific suggestion", () => {
    expect(suggestedAction("promo_launched", { discountPct: 25 })).toMatch(/^Their 25%-off promotion is live now; consider a counter-offer/);
    expect(suggestedAction("sold_out", { title: "Daily Greens" })).toMatch(/^Daily Greens is unavailable/);
    expect(suggestedAction("product_launched", { title: "Night Cream" })).toMatch(/^Compare Night Cream/);
  });
});

describe("isSlackWebhookUrl", () => {
  it("accepts only Slack's incoming-webhook URLs", () => {
    expect(isSlackWebhookUrl("https://hooks.slack.com/services/T000/B000/XXXXabcd")).toBe(true);
    expect(isSlackWebhookUrl(" https://hooks.slack.com/services/T000/B000/XXXXabcd ")).toBe(true);
    for (const bad of [
      "http://hooks.slack.com/services/T000/B000/XXXX",
      "https://hooks.slack.com.evil.com/services/T/B/X",
      "https://evil.com/?https://hooks.slack.com/services/T/B/X",
      "https://hooks.slack.com/services/T000/B000/XXXX/../../admin",
      "https://127.0.0.1/services/T/B/X",
      "",
    ]) {
      expect(isSlackWebhookUrl(bad), bad).toBe(false);
    }
  });
});

const bundle: AlertBundle = {
  storeName: "Dewlane",
  storeDomain: "dewlane.com",
  competitorId: "c1",
  events: [
    { type: "product_launched", payload: { title: "Night Cream", price: 4800 }, detectedAt: "2026-09-30T14:00:00Z" },
    { type: "sitewide_sale_detected", payload: { productsDiscounted: 71, avgPctOff: 24 }, detectedAt: "2026-09-30T14:05:00Z" },
  ],
};

describe("renderAlertEmail", () => {
  it("has what happened, when, a link, one suggested move and the counter", () => {
    const email = renderAlertEmail(bundle, "https://gettrailwatch.com", 14);
    expect(email.subject).toBe("Dewlane: 2 moves just now");
    for (const part of [
      "Dewlane launched Night Cream at $48.",
      "Dewlane is running a sitewide sale",
      "Suggested move",
      "consider a counter-offer",
      "https://gettrailwatch.com/competitors/c1",
      "Competitor moves caught this month: 14",
      "EDT", // times are shown in US Eastern
    ]) {
      expect(email.text).toContain(part);
    }
    expect(email.html).toContain("https://gettrailwatch.com/competitors/c1");
  });

  it("a single event becomes the subject line", () => {
    const email = renderAlertEmail({ ...bundle, events: [bundle.events[0]] }, "https://x.test", 1);
    expect(email.subject).toBe("Dewlane launched Night Cream at $48.");
  });

  it("escapes store-supplied text in HTML", () => {
    const evil = { ...bundle, storeName: '<script>alert("x")</script>' };
    const { html } = renderAlertEmail(evil, "https://x.test", 1);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderAlertSlack", () => {
  it("builds blocks with a text fallback and escapes mrkdwn control characters", () => {
    const msg = renderAlertSlack({ ...bundle, storeName: "A&B <Co>" }, "https://x.test");
    expect(msg.text).toBe("A&B <Co>: 2 moves just now");
    const body = JSON.stringify(msg.blocks);
    expect(body).toContain("A&amp;B &lt;Co&gt;");
    expect(body).toContain("<https://x.test/competitors/c1|See A&amp;B &lt;Co&gt; on TrailWatch>");
  });
});
