import { describe, expect, it } from "vitest";
import { buildMeaningPrompt, parseMeanings } from "./meaning";

describe("meaning prompt", () => {
  it("numbers the moves and includes recent history", () => {
    const { user } = buildMeaningPrompt({
      storeName: "Hearth & Pine",
      today: "2026-09-30",
      events: [{ id: "e1", type: "product_launched", payload: { title: "Organic Rib Knit Throw (Garnet)", price: 9900 } }],
      recent: [{ type: "product_launched", title: "Linen Throw", detectedAt: "2026-09-12T10:00:00Z" }],
    });
    expect(user).toContain("1. Hearth & Pine launched Organic Rib Knit Throw (Garnet)");
    expect(user).toContain("2026-09-12 product launched: Linen Throw");
  });

  it("accepts only one non-empty meaning per move", () => {
    expect(parseMeanings('{"meanings": ["Their third throw this month."]}', 1)).toEqual(["Their third throw this month."]);
    expect(parseMeanings('{"meanings": ["a", "b"]}', 1)).toBeNull();
    expect(parseMeanings('{"meanings": [""]}', 1)).toBeNull();
    expect(parseMeanings("not json", 1)).toBeNull();
  });
});
