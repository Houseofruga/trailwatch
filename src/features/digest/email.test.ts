import { describe, it, expect } from "vitest";
import { renderDigest } from "./email";
import type { UserDigest } from "./build";

const NOW = Date.parse("2026-08-21T12:00:00Z");

function digest(over: Partial<UserDigest> = {}): UserDigest {
  return {
    userId: "u1",
    email: "a@example.com",
    plan: "free",
    changeCount: 2,
    competitorCount: 1,
    hiddenCompetitorCount: 0,
    hiddenChangeCount: 0,
    summaryStrip: [{ name: "Acme", count: 2 }],
    showSummaryStrip: false,
    trivialFiltered: 0,
    unreachable: [],
    competitors: [
      {
        name: "Acme",
        domain: "acme.com",
        initials: "AC",
        changeCount: 2,
        pages: [
          {
            typeLabel: "Pricing",
            path: "/pricing",
            moreCount: 0,
            changes: [
              { summary: "Pro plan rose to $25/mo", when: "1d ago", changeId: "c1", isFallback: false },
            ],
          },
          {
            typeLabel: "Changelog",
            path: "/changelog",
            moreCount: 0,
            changes: [{ summary: "Shipped SSO & audit logs", when: "2d ago", changeId: "c2", isFallback: false }],
          },
        ],
      },
    ],
    ...over,
  };
}

describe("renderDigest", () => {
  const email = renderDigest(digest(), "https://trailwatch.test", "https://trailwatch.test/unsub/tok", NOW);

  it("counts changes in the subject (plural)", () => {
    expect(email.subject).toContain("2 changes");
  });

  it("uses the logo image with an alt fallback, not the plain word", () => {
    expect(email.html).toContain("/email-logo-dark.png");
    expect(email.html).toContain("/email-logo-light.png");
    expect(email.html).toContain('alt="TrailWatch"');
  });

  it("includes every summary, page type, path, and domain in both bodies", () => {
    for (const body of [email.html, email.text]) {
      expect(body.toLowerCase()).toContain("acme"); // text uppercases the header
      expect(body).toContain("acme.com");
      expect(body).toContain("Pro plan rose to $25/mo");
      expect(body).toContain("Shipped SSO"); // "&" escaped in html, raw in text
      expect(body).toContain("/pricing");
    }
  });

  it("builds change links from the change id", () => {
    expect(email.html).toContain("https://trailwatch.test/changes/c1");
    expect(email.text).toContain("https://trailwatch.test/changes/c2");
  });

  it("links to the dashboard and uses the provided unsubscribe URL", () => {
    expect(email.html).toContain("https://trailwatch.test/dashboard");
    expect(email.html).toContain("https://trailwatch.test/unsub/tok");
  });

  it("shows the upgrade nudge for Free and hides it for Pro", () => {
    expect(renderDigest(digest({ plan: "free" }), "https://x.test", undefined, NOW).html).toContain("Upgrade to Pro");
    const pro = renderDigest(digest({ plan: "pro" }), "https://x.test", undefined, NOW);
    expect(pro.html).not.toContain("Upgrade to Pro");
    expect(pro.html).toContain("Pro plan");
  });

  it("renders the trivial-filtered line only when there were any", () => {
    expect(renderDigest(digest({ trivialFiltered: 0 }), "https://x.test", undefined, NOW).html).not.toContain("trivial");
    expect(renderDigest(digest({ trivialFiltered: 7 }), "https://x.test", undefined, NOW).html).toContain("7 trivial edits");
  });

  it("renders the couldn't-reach module when pages are unreachable", () => {
    const withBroken = renderDigest(
      digest({ unreachable: [{ competitor: "Figma", path: "/pricing" }] }),
      "https://x.test",
      undefined,
      NOW,
    );
    expect(withBroken.html).toContain("Couldn't reach");
    expect(withBroken.html).toContain("Figma");
  });

  it("shows the overflow note and summary strip on a busy week", () => {
    const busy = renderDigest(
      digest({
        changeCount: 24,
        competitorCount: 6,
        hiddenCompetitorCount: 2,
        hiddenChangeCount: 8,
        showSummaryStrip: true,
        summaryStrip: [
          { name: "Notion", count: 4 },
          { name: "Linear", count: 2 },
          { name: "Figma", count: 1 },
        ],
      }),
      "https://x.test",
      undefined,
      NOW,
    );
    expect(busy.html).toContain("most active");
    expect(busy.html).toContain("Notion");
  });

  it("shows a per-page '+N more' when a page has extra changes", () => {
    const d = digest();
    d.competitors[0].pages[0].moreCount = 3;
    const out = renderDigest(d, "https://x.test", undefined, NOW);
    expect(out.html).toContain("+3 more changes on this page");
  });

  it("escapes HTML in summaries to prevent injection", () => {
    const d = digest();
    d.competitors[0].pages[0].changes[0].summary = "<script>alert(1)</script>";
    const evil = renderDigest(d, "https://x.test", undefined, NOW);
    expect(evil.html).not.toContain("<script>alert(1)</script>");
    expect(evil.html).toContain("&lt;script&gt;");
  });

  it("uses the singular in the subject for a single change", () => {
    const single = renderDigest(digest({ changeCount: 1 }), "https://x.test", undefined, NOW);
    expect(single.subject).toContain("1 change");
    expect(single.subject).not.toContain("1 changes");
  });

  it("prints a deterministic week range from the run time", () => {
    expect(email.html).toContain("Week of Aug 14–20");
  });
});
