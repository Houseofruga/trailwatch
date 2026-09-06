/* Sandbox seed — creates a Pro and a Free test user with sample data in the
   Supabase project, so features can be tested end-to-end while developing.
   Idempotent: re-running wipes each test user's competitors and reseeds.

   Run:  npx tsx --env-file=.env.local scripts/seed-sandbox.ts
   Wipe: npx tsx --env-file=.env.local scripts/seed-sandbox.ts --teardown

   Uses the service-role key (admin auth + RLS-bypassing writes). Test accounts
   only — never real customer data. */
import { createHash } from "node:crypto";
import { getTeardownProvider } from "../src/features/competitorTeardown";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP_ORIGIN = process.env.SANDBOX_ORIGIN || "http://localhost:3000";
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const rest = (p: string) => `${base}/rest/v1/${p}`;
const auth = (p: string) => `${base}/auth/v1/${p}`;
const teardown = process.argv.includes("--teardown");

type Seed = {
  email: string;
  password: string;
  plan: "free" | "paid";
  competitors: Array<{ name: string; pages: Array<{ label: string; url: string; text: string }> }>;
};

const LINEAR_HOME = `Linear is the issue tracking tool you'll enjoy using. Streamline issues, sprints, and product roadmaps. Built for high-performance teams that ship. Purpose-built for modern software development. Manage issues, cycles, and projects with a fast, keyboard-first interface. Trusted by thousands of the world's best product teams.`;
const LINEAR_PRICING = `Pricing. Free — $0. For individuals and small teams getting started. Unlimited members, 250 issues, basic integrations. Basic — $8 per user / month. For growing teams. Unlimited issues, admin roles, private teams. Business — $14 per user / month. For scaling teams. Linear Asks, SAML/SCIM, advanced integrations. Enterprise — Contact us. For organizations with advanced security and control needs. Annual billing available at a discount.`;
const LINEAR_CHANGELOG = `Changelog. This week: new sub-issues drag and drop. Improved Slack integration. Faster search. Last week: dark mode refresh, project milestones, API rate limit increases.`;

const NOTION_HOME = `Notion is the connected workspace where better, faster work happens. Write, plan, and organize all in one place. Docs, wikis, projects, and AI in a single tool your whole team can use.`;
const NOTION_PRICING = `Plans. Free — $0 for individuals. Plus — $10 per seat / month for small groups. Business — $15 per seat / month for companies. Enterprise — custom pricing. Notion AI add-on available.`;

const FIGMA_HOME = `Figma is the collaborative interface design tool. Design, prototype, and gather feedback all in one place. Nothing great is made alone — bring everyone into the process.`;
const CANVA_HOME = `Canva makes design simple for everyone. Create stunning presentations, social posts, videos, and more with drag-and-drop templates. Design anything, publish anywhere.`;

const SEEDS: Seed[] = [
  {
    email: "pro-test@trailwatch.test",
    password: "Sandbox-Pro-2026!",
    plan: "paid",
    competitors: [
      {
        name: "Linear",
        pages: [
          { label: "Home", url: "https://linear.app", text: LINEAR_HOME },
          { label: "Pricing", url: "https://linear.app/pricing", text: LINEAR_PRICING },
          { label: "Changelog", url: "https://linear.app/changelog", text: LINEAR_CHANGELOG },
        ],
      },
      {
        name: "Notion",
        pages: [
          { label: "Home", url: "https://www.notion.so", text: NOTION_HOME },
          { label: "Pricing", url: "https://www.notion.so/pricing", text: NOTION_PRICING },
        ],
      },
      {
        name: "Figma",
        pages: [{ label: "Home", url: "https://www.figma.com", text: FIGMA_HOME }],
      },
    ],
  },
  {
    email: "free-test@trailwatch.test",
    password: "Sandbox-Free-2026!",
    plan: "free",
    competitors: [
      // Seeded at the Free limit (2) so the "add competitor -> upsell" flow is testable.
      { name: "Canva", pages: [{ label: "Home", url: "https://www.canva.com", text: CANVA_HOME }] },
      { name: "Figma", pages: [{ label: "Home", url: "https://www.figma.com", text: FIGMA_HOME }] },
    ],
  },
];

async function j(res: Response) {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return t;
  }
}

/** Ensure an auth user exists (confirmed) and return its id. */
async function ensureUser(email: string, password: string): Promise<string> {
  const create = await fetch(auth("admin/users"), {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (create.ok) {
    const u = await j(create);
    return u.id as string;
  }
  // Already exists — find via public.users (email column) and reset the password.
  const look = await j(await fetch(rest(`users?select=id&email=eq.${encodeURIComponent(email)}`), { headers: H }));
  const id = Array.isArray(look) && look[0]?.id;
  if (!id) throw new Error(`could not create or find user ${email}: ${JSON.stringify(await j(create))}`);
  await fetch(auth(`admin/users/${id}`), {
    method: "PUT",
    headers: H,
    body: JSON.stringify({ password, email_confirm: true }),
  });
  return id;
}

async function findUserId(email: string): Promise<string | null> {
  const look = await j(await fetch(rest(`users?select=id&email=eq.${encodeURIComponent(email)}`), { headers: H }));
  return (Array.isArray(look) && look[0]?.id) || null;
}

async function wipeCompetitors(userId: string) {
  // Cascades to pages -> snapshots/changes. page_insights cascades via page fk.
  await fetch(rest(`competitors?user_id=eq.${userId}`), { method: "DELETE", headers: H });
}

async function magicLink(email: string, next: string): Promise<string | null> {
  const res = await fetch(auth("admin/generate_link"), {
    method: "POST",
    headers: H,
    body: JSON.stringify({
      type: "magiclink",
      email,
      options: { redirect_to: `${APP_ORIGIN}/auth/confirm?next=${encodeURIComponent(next)}` },
    }),
  });
  const data = await j(res);
  const hashed = data?.properties?.hashed_token || data?.hashed_token;
  if (!hashed) return null;
  return `${APP_ORIGIN}/auth/confirm?token_hash=${hashed}&type=magiclink&next=${encodeURIComponent(next)}`;
}

async function insightsReachable(): Promise<boolean> {
  const r = await fetch(rest("page_insights?select=page_id&limit=1"), { headers: H });
  return r.ok;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Best-effort: a failed generation (rate limit, unusable JSON) is non-fatal —
// the dashboard regenerates that page on view. Never aborts the seed.
async function prewarmBaseline(pageId: string, url: string, label: string, text: string): Promise<boolean> {
  try {
    const outcome = await getTeardownProvider().analyze({ url, title: label, pages: [{ label, text }] });
    if (!outcome.ok) return false;
    const r = outcome.result;
    const profile = { title: r.title, positioning: r.positioning, pricingTiers: r.pricingTiers, whatToWatch: r.whatToWatch };
    const up = await fetch(rest("page_insights?on_conflict=page_id"), {
      method: "POST",
      headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ page_id: pageId, profile, model: r.provider }),
    });
    return up.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (teardown) {
    for (const s of SEEDS) {
      const id = await findUserId(s.email);
      if (!id) {
        console.log(`— ${s.email}: not present`);
        continue;
      }
      await wipeCompetitors(id);
      await fetch(auth(`admin/users/${id}`), { method: "DELETE", headers: H });
      console.log(`🗑  removed ${s.email}`);
    }
    console.log("\nTeardown complete.");
    return;
  }

  const canBaseline = await insightsReachable();
  console.log(canBaseline ? "✅ page_insights reachable — will pre-warm baselines" : "⚠️  page_insights NOT reachable — skipping baselines (apply migration 0005)");

  for (const s of SEEDS) {
    const userId = await ensureUser(s.email, s.password);
    // Plan is service-role only (0004 locked client updates) — set it directly.
    await fetch(rest(`users?id=eq.${userId}`), { method: "PATCH", headers: H, body: JSON.stringify({ plan: s.plan }) });
    await wipeCompetitors(userId);

    let pageCount = 0;
    for (const comp of s.competitors) {
      const [competitor] = await j(
        await fetch(rest("competitors"), {
          method: "POST",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify({ user_id: userId, name: comp.name }),
        }),
      );
      for (const pg of comp.pages) {
        const [page] = await j(
          await fetch(rest("pages"), {
            method: "POST",
            headers: { ...H, Prefer: "return=representation" },
            body: JSON.stringify({ competitor_id: competitor.id, url: pg.url, label: pg.label, is_active: true }),
          }),
        );
        const [snap] = await j(
          await fetch(rest("snapshots"), {
            method: "POST",
            headers: { ...H, Prefer: "return=representation" },
            body: JSON.stringify({
              page_id: page.id,
              content_text: pg.text,
              content_hash: createHash("sha256").update(pg.text).digest("hex"),
            }),
          }),
        );
        await fetch(rest(`pages?id=eq.${page.id}`), {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({ latest_snapshot_id: snap.id, last_checked_at: new Date().toISOString() }),
        });
        if (canBaseline) {
          const ok = await prewarmBaseline(page.id, pg.url, pg.label, pg.text);
          if (!ok) console.log(`   · baseline for ${comp.name}/${pg.label} deferred (will generate on view)`);
          await sleep(2500); // stay under Groq's free-tier TPM limit
        }
        pageCount++;
      }
    }
    const link = await magicLink(s.email, "/competitors");
    console.log(`\n✅ ${s.plan.toUpperCase()} user: ${s.email}`);
    console.log(`   password: ${s.password}`);
    console.log(`   ${s.competitors.length} competitors, ${pageCount} pages${canBaseline ? " (baselines pre-warmed)" : ""}`);
    if (link) console.log(`   one-click login: ${link}`);
  }
  console.log("\nDone. Log in with either link above (or email + password on /login).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
