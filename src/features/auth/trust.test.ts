import { describe, expect, it } from "vitest";
import { emailMatchesStore, isDisposableEmail } from "./trust";

describe("isDisposableEmail", () => {
  it("flags throwaway inboxes and their subdomains", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true);
    expect(isDisposableEmail("x@MAILINATOR.com")).toBe(true);
    expect(isDisposableEmail("x@foo.mailinator.com")).toBe(true);
  });

  it("lets real inboxes through", () => {
    expect(isDisposableEmail("founder@gmail.com")).toBe(false);
    expect(isDisposableEmail("hi@lunaskin.co")).toBe(false);
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });
});

describe("emailMatchesStore", () => {
  it("matches the same registrable domain, www or subdomain aside", () => {
    expect(emailMatchesStore("ana@lunaskin.com", "lunaskin.com")).toBe(true);
    expect(emailMatchesStore("ana@mail.lunaskin.com", "www.lunaskin.com")).toBe(true);
    expect(emailMatchesStore("ana@lunaskin.co.uk", "shop.lunaskin.co.uk")).toBe(true);
  });

  it("doesn't match a different site, a free inbox, or no store", () => {
    expect(emailMatchesStore("ana@gmail.com", "lunaskin.com")).toBe(false);
    expect(emailMatchesStore("ana@lunaskin.com", "lunaskin.co")).toBe(false);
    expect(emailMatchesStore("ana@lunaskin.com", null)).toBe(false);
  });
});
