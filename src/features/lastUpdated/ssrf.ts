// SSRF guard for the public Last-Updated Checker. Anyone can paste a URL, so
// we must refuse to fetch anything that resolves to a private / internal host,
// or uses a non-web scheme. Pure IP/URL logic here is unit-tested; the DNS
// resolution wrapper lives in fetch.ts.

import { isIP } from "node:net";

/** Parse a raw string into an http(s) URL, rejecting anything else. */
export function validateUrlInput(
  raw: string,
): { ok: true; url: URL } | { ok: false; reason: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, reason: "Enter a URL to check." };

  // Allow users to omit the scheme ("example.com/pricing"), but don't rewrite
  // an explicit non-web scheme like ftp:// into https:// — leave it so the
  // protocol check below can reject it.
  const withScheme = /:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https URLs are supported." };
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0") {
    return { ok: false, reason: "Local addresses can't be checked." };
  }

  // If the host is a literal IP, it must be public. (DNS-resolved hosts are
  // re-checked in fetch.ts after resolution.)
  const ipVersion = isIP(host);
  if (ipVersion !== 0 && isPrivateIp(host)) {
    return { ok: false, reason: "Private and internal addresses can't be checked." };
  }

  return { ok: true, url };
}

/** True for loopback / private / link-local / reserved IPs (v4 and v6). */
export function isPrivateIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true; // malformed — treat as unsafe
  }
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast + reserved + 255.255.255.255
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::") return true; // loopback / unspecified

  // IPv4-mapped (::ffff:1.2.3.4) — validate the embedded v4.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  const firstHextet = addr.split(":")[0];
  const head = parseInt(firstHextet || "0", 16);
  if (Number.isNaN(head)) return true; // malformed — treat as unsafe
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}
