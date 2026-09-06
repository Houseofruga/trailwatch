/* One-off backfill repair: re-summarise archive (`source='archive'`) changes
   that were stored with the "(summary unavailable)" fallback because no LLM
   provider key was configured when the page was first backfilled.

   Uses the SAME summarizer seam as the live pipeline (Groq → Anthropic → null),
   reading the stored excerpt_before/excerpt_after — so it never re-fetches the
   Wayback Machine. Idempotent: only touches rows whose summary still ends in
   "(summary unavailable)", so re-running is safe and skips already-fixed rows.

   Run:      npx tsx --env-file=.env.local scripts/resummarize-archive.ts
   Preview:  npx tsx --env-file=.env.local scripts/resummarize-archive.ts --dry

   Requires GROQ_API_KEY or ANTHROPIC_API_KEY in the env — without one the
   summarizer declines and nothing is updated (it tells you so and exits). */
import { getSummarizer } from "../src/features/summaries";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const rest = (p: string) => `${base}/rest/v1/${p}`;
const dry = process.argv.includes("--dry");

// Be polite to the free Groq tier — a short gap between calls avoids the
// rate/413 spikes seen during bulk seeding.
const THROTTLE_MS = 1500;

type Row = {
  id: string;
  page_id: string;
  filter_reason: string;
  excerpt_before: string;
  excerpt_after: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The live summarizer prompt truncates each side to the first 2000 chars, which
// on a long page is shared boilerplate — so the model sees no difference and
// declines. Feed it the actual changed lines instead (same set the noise filter
// used), so the summary reflects what really moved. Falls back to the raw text
// if the line diff is empty (e.g. a within-line change).
function focusOnDiff(before: string, after: string): { oldText: string; newText: string } {
  const norm = (t: string) => t.split("\n").map((l) => l.trim()).filter(Boolean);
  const b = norm(before);
  const a = norm(after);
  const bSet = new Set(b);
  const aSet = new Set(a);
  const removed = b.filter((l) => !aSet.has(l));
  const added = a.filter((l) => !bSet.has(l));
  if (removed.length === 0 && added.length === 0) return { oldText: before, newText: after };
  return { oldText: removed.join("\n"), newText: added.join("\n") };
}

async function main() {
  if (!process.env.GROQ_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "No GROQ_API_KEY or ANTHROPIC_API_KEY in env — the summarizer would decline.\n" +
        "Set one in .env.local and re-run.",
    );
    process.exit(1);
  }

  // Archive rows still carrying the fallback text.
  const rowsRes = await fetch(
    rest(
      "changes?source=eq.archive&summary=like.*summary%20unavailable*" +
        "&select=id,page_id,filter_reason,excerpt_before,excerpt_after",
    ),
    { headers: H },
  );
  const rows: Row[] = await rowsRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("Nothing to fix — no archive rows with an unavailable summary.");
    return;
  }

  // Page labels for the summarizer prompt (one fetch, id → label).
  const ids = [...new Set(rows.map((r) => r.page_id))];
  const pagesRes = await fetch(
    rest(`pages?id=in.(${ids.join(",")})&select=id,label`),
    { headers: H },
  );
  const pages: Array<{ id: string; label: string }> = await pagesRes.json();
  const labelOf = new Map(pages.map((p) => [p.id, p.label]));

  console.log(`${rows.length} archive row(s) to re-summarise${dry ? " (dry run)" : ""}\n`);
  const summarizer = getSummarizer();
  let fixed = 0;
  let declined = 0;
  let failed = 0;

  // These rows are already judged meaningful, so a "trivial" decline is just
  // model noise — retry once, and if it still declines write a clean fallback
  // (never leave the internal-reason "(summary unavailable)" text on the row).
  const FALLBACK = "This page changed — open it to see what's different.";

  for (const r of rows) {
    const label = labelOf.get(r.page_id) ?? "page";
    try {
      const { oldText, newText } = focusOnDiff(r.excerpt_before ?? "", r.excerpt_after ?? "");
      let summary: string | null = null;
      for (let attempt = 0; attempt < 2 && summary === null; attempt++) {
        const out = await summarizer.summarize({ label, oldText, newText });
        if ("summary" in out) summary = out.summary;
        else if (attempt === 0) await sleep(THROTTLE_MS); // brief pause before retry
      }
      const finalText = summary ?? FALLBACK;
      if (summary) fixed++;
      else declined++;
      console.log(`  ${summary ? "✓" : "~"} ${r.id.slice(0, 8)} [${label}] ${finalText}`);
      if (!dry) {
        const patch = await fetch(rest(`changes?id=eq.${r.id}`), {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ summary: finalText }),
        });
        if (!patch.ok) {
          failed++;
          console.log(`      ! update failed: ${patch.status} ${await patch.text()}`);
        }
      }
    } catch (e) {
      failed++;
      console.log(`  ! ${r.id.slice(0, 8)} [${label}] error: ${(e as Error).message}`);
    }
    await sleep(THROTTLE_MS);
  }

  console.log(
    `\nDone. ${fixed} summarised, ${declined} fell back to plain wording, ${failed} failed${dry ? " (dry run — nothing written)" : ""}.`,
  );
}

main();
