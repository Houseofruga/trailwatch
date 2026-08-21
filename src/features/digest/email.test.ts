import { describe, it, expect } from "vitest";
import { renderDigest } from "./email";
import type { UserDigest } from "./build";

const digest: UserDigest = {
  userId: "u1",
  email: "a@example.com",
  changeCount: 2,
  competitors: [
    {
      name: "Acme",
      lines: [
        {
          pageLabel: "Pricing",
          url: "https://acme.com/pricing",
          summary: "Pro plan rose to $25/mo",
          detectedAt: "2026-08-20T12:00:00Z",
        },
        {
          pageLabel: "Changelog",
          url: "https://acme.com/changelog",
          summary: "Shipped SSO & audit logs",
          detectedAt: "2026-08-19T12:00:00Z",
        },
      ],
    },
  ],
};

describe("renderDigest", () => {
  const email = renderDigest(digest, "https://trailwatch.test");

  it("counts changes in the subject", () => {
    expect(email.subject).toContain("2 changes");
  });

  it("includes every summary, label, and link in both bodies", () => {
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Acme");
      expect(body).toContain("Pro plan rose to $25/mo");
      expect(body).toContain("Shipped SSO"); // "&" is escaped in html, raw in text
      expect(body).toContain("acme.com/pricing");
    }
  });

  it("links to the dashboard", () => {
    expect(email.html).toContain("https://trailwatch.test/dashboard");
    expect(email.text).toContain("https://trailwatch.test/dashboard");
  });

  it("escapes HTML in summaries to prevent injection into the email", () => {
    const evil = renderDigest(
      {
        ...digest,
        changeCount: 1,
        competitors: [
          {
            name: "Acme",
            lines: [
              {
                pageLabel: "P",
                url: "https://acme.com",
                summary: "<script>alert(1)</script>",
                detectedAt: "2026-08-20T12:00:00Z",
              },
            ],
          },
        ],
      },
      "https://trailwatch.test",
    );
    expect(evil.html).not.toContain("<script>alert(1)</script>");
    expect(evil.html).toContain("&lt;script&gt;");
  });

  it("uses singular in the subject for a single change", () => {
    const single = renderDigest({ ...digest, changeCount: 1 }, "https://trailwatch.test");
    expect(single.subject).toContain("1 change");
    expect(single.subject).not.toContain("1 changes");
  });
});
