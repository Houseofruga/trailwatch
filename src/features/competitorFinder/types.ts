// Types for the "Find your competitors" hero tool (/try). Given a company name
// or URL, a provider (Groq or Anthropic — same seam as competitorTeardown and
// summaries) suggests a few direct competitors to watch. Display-only, editable
// by the visitor; never authoritative (LLM guesses can be wrong for niche cos).

export type Competitor = {
  name: string;
  url: string; // best-guess homepage (bare domain), may be empty
  why: string; // one short clause on why it competes, may be empty
};

export type FinderResult = {
  company: string; // the (possibly site-derived) company label we reasoned about
  competitors: Competitor[];
  provider: string; // "groq" | "anthropic" (attribution/debugging)
};

export type FinderOutcome =
  | { ok: true; result: FinderResult }
  | { ok: false; reason: string };

export interface FinderProvider {
  suggest(input: {
    company: string;
    groundingText: string | null;
  }): Promise<FinderOutcome>;
}
