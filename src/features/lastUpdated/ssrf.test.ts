import { describe, expect, it } from "vitest";
import { isPrivateIp, validateUrlInput } from "./ssrf";

describe("validateUrlInput", () => {
  it("accepts a normal https URL", () => {
    const r = validateUrlInput("https://example.com/pricing");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.hostname).toBe("example.com");
  });

  it("adds https:// when the scheme is omitted", () => {
    const r = validateUrlInput("example.com");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url.protocol).toBe("https:");
  });

  it("rejects non-web schemes", () => {
    expect(validateUrlInput("ftp://example.com").ok).toBe(false);
    expect(validateUrlInput("file:///etc/passwd").ok).toBe(false);
  });

  it("rejects localhost and 0.0.0.0", () => {
    expect(validateUrlInput("http://localhost:3000").ok).toBe(false);
    expect(validateUrlInput("http://0.0.0.0").ok).toBe(false);
  });

  it("rejects private IP literals", () => {
    expect(validateUrlInput("http://127.0.0.1").ok).toBe(false);
    expect(validateUrlInput("http://10.0.0.5").ok).toBe(false);
    expect(validateUrlInput("http://192.168.1.1").ok).toBe(false);
    expect(validateUrlInput("http://169.254.169.254").ok).toBe(false); // cloud metadata
  });

  it("accepts a public IP literal", () => {
    expect(validateUrlInput("http://1.1.1.1").ok).toBe(true);
  });

  it("rejects empty input", () => {
    expect(validateUrlInput("   ").ok).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("flags IPv4 private ranges", () => {
    for (const ip of ["0.0.0.0", "10.1.2.3", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.0.1", "100.64.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("allows public IPv4", () => {
    for (const ip of ["1.1.1.1", "8.8.8.8", "93.184.216.34"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });

  it("flags IPv6 loopback / link-local / unique-local", () => {
    for (const ip of ["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("flags IPv4-mapped private IPv6", () => {
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public IPv6", () => {
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
  });
});
