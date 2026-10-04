import type { Metadata } from "next";
import { verifyRating, type RatingTarget, type RatingValue } from "@/features/beta/ratings";
import { AuthShell } from "@/features/auth/AuthShell";
import { RateForm } from "./RateForm";

export const metadata: Metadata = { title: "Thanks for the feedback", robots: { index: false } };

type Params = { u?: string; k?: string; i?: string; v?: string; t?: string };

/** Landing page for the one-click rating links in the briefing and alert emails (beta). */
export default async function RatePage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const target = p.k === "briefing" || p.k === "alert" ? (p.k as RatingTarget) : null;
  const value = p.v === "useful" || p.v === "not_useful" ? (p.v as RatingValue) : null;
  const valid =
    !!p.u && !!p.i && !!p.t && !!target && !!value && verifyRating({ userId: p.u, target, id: p.i, value }, p.t);
  return (
    <AuthShell>
      <RateForm claim={valid ? { u: p.u!, k: target!, i: p.i!, v: value!, t: p.t! } : null} />
    </AuthShell>
  );
}
