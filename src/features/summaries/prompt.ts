import { diffLines } from "@/features/checks/noiseFilter";
import type { SummaryInput } from "./types";

// The model may return this exact string instead of a summary to decline a
// diff it judges trivial (SPEC.md F5). Kept short and unmistakable.
export const NO_CHANGE_SENTINEL = "NO_MEANINGFUL_CHANGE";

// Cap each side before it reaches the prompt — the product's whole edge is
// low cost/noise, and a diff summary doesn't need the whole page.
const EXCERPT_CAP = 2000;

const SYSTEM = `You summarize what changed on a competitor's web page for a busy founder.

Rules:
- Reply with ONE or TWO plain-English sentences: what changed, and if it's obvious, why it might matter.
- No HTML, no markdown, no preamble, no "the page now says". Just the change itself.
- Be specific about numbers, prices, and plan names when they change.
- If the difference is trivial or cosmetic (reworded boilerplate, reordering, a moved element with no new information), reply with exactly ${NO_CHANGE_SENTINEL} and nothing else.`;

export function buildPrompt(input: SummaryInput): { system: string; user: string } {
  // Show the model the lines that actually changed, not the first N chars of the
  // whole page. On a long page the top is shared nav/hero boilerplate, so
  // full-text excerpts look identical and the model wrongly declines a real
  // change lower down. Fall back to truncated full text when there's no
  // whole-line diff (a within-line edit), so we never send an empty diff.
  const { added, removed } = diffLines(input.oldText, input.newText);
  const hasLineDiff = added.length > 0 || removed.length > 0;
  const before = (hasLineDiff ? removed.join("\n") : input.oldText).slice(0, EXCERPT_CAP);
  const after = (hasLineDiff ? added.join("\n") : input.newText).slice(0, EXCERPT_CAP);

  const user = `Page: ${input.label}

BEFORE:
${before}

AFTER:
${after}`;

  return { system: SYSTEM, user };
}
