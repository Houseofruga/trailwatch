// The provider seam. The check engine only ever talks to this interface, so
// swapping the model/provider (or adding a free one) is a new file plus one
// line in index.ts — runCheck never changes.

export type SummaryInput = { label: string; oldText: string; newText: string };

// `skipped` is SPEC.md F5's belt-and-suspenders: a provider may judge the
// diff trivial and decline, in which case the engine suppresses the change.
export type SummaryResult = { summary: string } | { skipped: true; reason: string };

export interface Summarizer {
  summarize(input: SummaryInput): Promise<SummaryResult>;
}
