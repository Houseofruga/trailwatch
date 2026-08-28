// A Google-style robots.txt matcher for the public tester tool. Unlike the
// product's deliberately-conservative isPathAllowed (checks/robots.ts), this
// handles Allow overrides, `*` and `$` wildcards, and longest-match-wins
// precedence — because a tester has to be *correct*, not just cautious.

export type Rule = { type: "allow" | "disallow"; path: string };
export type Group = { agents: string[]; rules: Rule[] };

export type MatchResult = {
  allowed: boolean;
  /** The rule that decided it, or null when nothing matched (default allow). */
  matched: Rule | null;
  /** Which user-agent group applied ("*" or a specific token), or null. */
  groupAgent: string | null;
};

/** Parse robots.txt into user-agent groups with their allow/disallow rules. */
export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      // Consecutive User-agent lines share one group; a User-agent after any
      // rule starts a fresh group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "disallow" || field === "allow") && current) {
      current.rules.push({ type: field, path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }

  return groups;
}

/** Rules that apply to a user-agent: the most specific token match, else `*`. */
function applicableRules(groups: Group[], userAgent: string): { rules: Rule[]; agent: string | null } {
  const ua = userAgent.toLowerCase();

  // Best specific token = the longest non-* agent token contained in the UA.
  let bestToken: string | null = null;
  for (const g of groups) {
    for (const a of g.agents) {
      if (a === "*") continue;
      if (ua.includes(a) && (bestToken === null || a.length > bestToken.length)) {
        bestToken = a;
      }
    }
  }

  const token = bestToken ?? "*";
  const rules = groups.filter((g) => g.agents.includes(token)).flatMap((g) => g.rules);
  return { rules, agent: bestToken ?? (groups.some((g) => g.agents.includes("*")) ? "*" : null) };
}

/** Does `path` match a robots pattern (supporting `*` and a trailing `$`)? */
function patternMatches(pattern: string, path: string): boolean {
  const hasEnd = pattern.endsWith("$");
  const core = hasEnd ? pattern.slice(0, -1) : pattern;
  const escaped = core
    .split("*")
    .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${hasEnd ? "$" : ""}`).test(path);
}

export function testPath(text: string, userAgent: string, path: string): MatchResult {
  const groups = parseRobots(text);
  const { rules, agent } = applicableRules(groups, userAgent);

  // Longest matching pattern wins; on a tie, Allow beats Disallow (Google's rule).
  let best: { rule: Rule; len: number } | null = null;
  for (const rule of rules) {
    if (rule.path === "") continue; // empty Disallow = "allow all", not a match
    if (!patternMatches(rule.path, path)) continue;
    const len = rule.path.length;
    if (!best || len > best.len || (len === best.len && rule.type === "allow")) {
      best = { rule, len };
    }
  }

  if (!best) return { allowed: true, matched: null, groupAgent: agent };
  return { allowed: best.rule.type === "allow", matched: best.rule, groupAgent: agent };
}
