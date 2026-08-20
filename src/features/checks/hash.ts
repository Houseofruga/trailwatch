import { createHash } from "node:crypto";

// SPEC.md §3: snapshots.content_hash — a fast equality check so the daily
// job can skip the noise filter entirely when nothing changed.
export function hashContent(normalizedText: string): string {
  return createHash("sha256").update(normalizedText).digest("hex");
}
