import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cameStraightFrom, originOf, recordPath } from "./backTrail";

function stubBrowser(historyLength: number) {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("window", { history: { length: historyLength } });
}

describe("back trail", () => {
  beforeEach(() => stubBrowser(3));
  afterEach(() => vi.unstubAllGlobals());

  it("only accepts known origins", () => {
    expect(originOf("home")).toBe("home");
    expect(originOf("alert")).toBeNull();
    expect(originOf(null)).toBeNull();
  });

  it("knows the page the visitor was on just before this one", () => {
    recordPath("/dashboard");
    recordPath("/competitors/abc");
    expect(cameStraightFrom("/dashboard")).toBe(true);
    expect(cameStraightFrom("/competitors")).toBe(false);
  });

  it("ignores a repeat of the same path (a re-render, a changed query)", () => {
    recordPath("/dashboard");
    recordPath("/competitors/abc");
    recordPath("/competitors/abc");
    expect(cameStraightFrom("/dashboard")).toBe(true);
  });

  it("forgets the origin once the visitor has been somewhere else since", () => {
    recordPath("/dashboard");
    recordPath("/competitors/abc");
    recordPath("/competitors/abc/report");
    recordPath("/competitors/abc");
    expect(cameStraightFrom("/dashboard")).toBe(false);
  });

  it("never goes back in a tab with no history (opened in a new tab)", () => {
    stubBrowser(1);
    recordPath("/dashboard");
    recordPath("/competitors/abc");
    expect(cameStraightFrom("/dashboard")).toBe(false);
  });
});
