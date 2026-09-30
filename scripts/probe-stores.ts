/* Probe stores the way "add competitor" will (pivot Phase 1): platform
   detection, display name, and which pages we'd watch — without touching the
   database. Useful for checking real stores by hand.

   Run:  npx tsx scripts/probe-stores.ts [domain ...]
   With no domains, probes a small built-in sample. */

import { probeStore } from "../src/features/stores/probeStore";

const SAMPLE = [
  "allbirds.com",
  "gymshark.com",
  "www.glossier.com",
  "amazon.com",
  "amazon.co.uk/some-product",
  "not a domain",
  "wikipedia.org",
];

function shortUrl(url: string): string {
  const u = new URL(url);
  return u.pathname === "/" ? "/" : u.pathname;
}

async function main() {
  const domains = process.argv.slice(2).length ? process.argv.slice(2) : SAMPLE;
  for (const input of domains) {
    const started = Date.now();
    const probe = await probeStore(input);
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`\n■ ${input}  (${secs}s)`);
    if (!probe.ok) {
      console.log(`  ✗ ${probe.code}: ${probe.message}`);
      continue;
    }
    const { platform } = probe;
    console.log(`  store     ${probe.name}  ·  key: ${probe.host}`);
    console.log(
      `  platform  ${platform.platform} (evidence: ${platform.evidence}; products.json ${platform.productsJsonAvailable ? "available" : "not available"})`,
    );
    for (const p of probe.pages) console.log(`  ✓ watch   ${p.kind.padEnd(16)} ${shortUrl(p.url)}`);
    for (const p of probe.skipped)
      console.log(`  – skip    ${p.kind.padEnd(16)} ${shortUrl(p.url)}  (${p.reason})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
