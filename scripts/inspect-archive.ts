/* One-off: list archive changes whose summary is the "(summary unavailable)"
   fallback, and dump the actual before/after diff so we can judge notability.
   Run: npx tsx --env-file=.env.local scripts/inspect-archive.ts */
const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const H = { apikey: key, Authorization: `Bearer ${key}` };

function changedLines(before: string, after: string) {
  const norm = (t: string) =>
    new Set(t.split("\n").map((l) => l.trim()).filter(Boolean));
  const b = norm(before);
  const a = norm(after);
  const added = [...a].filter((l) => !b.has(l));
  const removed = [...b].filter((l) => !a.has(l));
  return { added, removed };
}

async function main() {
  const url =
    `${base}/rest/v1/changes?source=eq.archive&summary=like.*summary%20unavailable*` +
    `&select=id,summary,detected_at,compared_from_at,excerpt_before,excerpt_after,page_id`;
  const res = await fetch(url, { headers: H });
  const rows: Array<{
    id: string;
    summary: string;
    detected_at: string;
    compared_from_at: string;
    excerpt_before: string;
    excerpt_after: string;
    page_id: string;
  }> = await res.json();

  console.log(`archive rows with "(summary unavailable)": ${rows.length}\n`);
  for (const r of rows) {
    const { added, removed } = changedLines(r.excerpt_before ?? "", r.excerpt_after ?? "");
    console.log("=".repeat(70));
    console.log(`id ${r.id.slice(0, 8)}  page ${r.page_id.slice(0, 8)}`);
    console.log(`summary: ${r.summary}`);
    console.log(`detected ${r.detected_at}  <- compared from ${r.compared_from_at}`);
    console.log(`  + ADDED (${added.length} line(s)):`);
    added.forEach((l) => console.log("      " + JSON.stringify(l)));
    console.log(`  - REMOVED (${removed.length} line(s)):`);
    removed.forEach((l) => console.log("      " + JSON.stringify(l)));
  }
}
main();
