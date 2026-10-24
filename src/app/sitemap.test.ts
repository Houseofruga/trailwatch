import { describe, expect, it } from "vitest";
import { GUIDES } from "@/features/guides";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("dates each page by when its content changed, not when the sitemap was read", () => {
    const readAt = Date.now();
    const entries = sitemap();
    // Each date is a day the page changed (midnight UTC), so always before the moment of reading.
    expect(entries.every((e) => e.lastModified instanceof Date && (e.lastModified as Date).getTime() < readAt)).toBe(true);
    const guide = entries.find((e) => e.url.endsWith(`/guides/${GUIDES[0].slug}`))!;
    expect((guide.lastModified as Date).toISOString().slice(0, 10)).toBe(GUIDES[0].date);
    expect(entries).toHaveLength(10 + GUIDES.length);
  });
});
