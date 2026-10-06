import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cameStraightFrom, originHref, originOf, recordPath, rememberHomeUrl } from "./backTrail";

function stubBrowser(historyLength: number) {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal("window", { history: { length: historyLength } });
}

const HOME = "/dashboard";
const STORE = "/competitors/abc";
const SNAPSHOT = "/competitors/abc/report";

describe("back trail", () => {
  beforeEach(() => stubBrowser(5));
  afterEach(() => vi.unstubAllGlobals());

  it("only accepts known origins", () => {
    expect(originOf("home")).toBe("home");
    expect(originOf("alert")).toBeNull();
    expect(originOf(null)).toBeNull();
  });

  it("knows the page directly behind this one", () => {
    recordPath(HOME);
    recordPath(STORE);
    expect(cameStraightFrom(HOME)).toBe(true);
    expect(cameStraightFrom("/competitors")).toBe(false);
  });

  it("ignores a repeat of the same path (a re-render, a changed query)", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(STORE);
    expect(cameStraightFrom(HOME)).toBe(true);
  });

  it("follows the trail two steps deep and back: Home, competitor, snapshot, back, back", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(SNAPSHOT);
    expect(cameStraightFrom(STORE)).toBe(true);
    recordPath(STORE, true); // the snapshot's back link steps back in history
    expect(cameStraightFrom(HOME)).toBe(true);
    recordPath(HOME, true);
    expect(cameStraightFrom(STORE)).toBe(false);
  });

  it("follows the forward button too", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(HOME, true);
    recordPath(STORE, true);
    expect(cameStraightFrom(HOME)).toBe(true);
  });

  it("a new page after going back replaces what was ahead", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(HOME, true);
    recordPath("/settings");
    expect(cameStraightFrom(HOME)).toBe(true);
    expect(cameStraightFrom(STORE)).toBe(false);
  });

  it("a snapshot reopened as a new page no longer has Home behind the competitor", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(SNAPSHOT);
    recordPath(STORE); // a plain link back, not a history step
    expect(cameStraightFrom(HOME)).toBe(false);
    expect(cameStraightFrom(SNAPSHOT)).toBe(true);
  });

  it("starts over on a history jump it can't place", () => {
    recordPath(HOME);
    recordPath(STORE);
    recordPath(SNAPSHOT);
    recordPath("/settings", true);
    expect(cameStraightFrom(SNAPSHOT)).toBe(false);
  });

  it("never goes back in a tab with no history (opened in a new tab)", () => {
    stubBrowser(1);
    recordPath(HOME);
    recordPath(STORE);
    expect(cameStraightFrom(HOME)).toBe(false);
  });

  it("returns to Home as it was left, and only to Home", () => {
    expect(originHref("home")).toBe("/dashboard");
    rememberHomeUrl("/dashboard?priority=high&page=3");
    expect(originHref("home")).toBe("/dashboard?priority=high&page=3");
    rememberHomeUrl("/settings");
    expect(originHref("home")).toBe("/dashboard");
  });
});
