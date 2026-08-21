import { describe, expect, it } from "vitest";
import { buildPrompt, NO_CHANGE_SENTINEL } from "./prompt";

describe("buildPrompt", () => {
  const input = {
    label: "Pricing",
    oldText: "Business plan is $14 per user per month.",
    newText: "Business plan is $16 per user per month.",
  };

  it("includes the page label and both texts", () => {
    const { user } = buildPrompt(input);
    expect(user).toContain("Pricing");
    expect(user).toContain("$14");
    expect(user).toContain("$16");
  });

  it("instructs the model on length and the no-change sentinel", () => {
    const { system } = buildPrompt(input);
    expect(system).toMatch(/one or two/i);
    expect(system).toContain(NO_CHANGE_SENTINEL);
  });

  it("caps each excerpt so token cost stays bounded", () => {
    const huge = "x".repeat(5000);
    const { user } = buildPrompt({ label: "Blog", oldText: huge, newText: huge });
    // 2 excerpts * 2000-char cap, plus the surrounding template — well under 5000.
    expect(user.length).toBeLessThan(4500);
  });
});
