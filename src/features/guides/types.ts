import type { ReactNode } from "react";
import type { AuthorId } from "./authors";

// Guides (SEO_PLAN.md §2, DESIGN 14-content): content lives in the repo as typed
// data. One file per guide in ./content; the article template renders the blocks.

export type GuideBlock =
  /** A section heading; `id` is its anchor and its entry in "On this page". */
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: ReactNode }
  | { type: "ol"; items: ReactNode[] }
  | { type: "ul"; items: ReactNode[] }
  | { type: "tip"; text: ReactNode }
  /** One line the reader types or copies (an address, not program code). */
  | { type: "code"; text: string }
  | { type: "table"; caption: string; head: { label: string; numeric?: boolean }[]; rows: string[][] }
  /** An example Trailwatch alert, drawn in the page (no image file). */
  | { type: "alertFigure"; store: string; when: string; title: string; detail: string; caption: string }
  /** The free store snapshot tool, usable in place. */
  | { type: "tool" };

export type GuideGroup = "black-friday" | "evergreen";

export type Guide = {
  slug: string;
  title: string;
  /** Short name for the breadcrumb. */
  crumb: string;
  /** One sentence under the title; also the meta description. */
  summary: string;
  /** One line for hub and related cards. */
  cardSummary: string;
  group: GuideGroup;
  /** ISO date, shown as "Oct 2, 2026". */
  date: string;
  readMinutes: number;
  author: AuthorId;
  blocks: GuideBlock[];
  /** Plain text, so the same answers feed the FAQ structured data. */
  faq: { q: string; a: string }[];
  /** Slugs of up to 3 guides; unknown or unpublished slugs are skipped. */
  related: string[];
};
