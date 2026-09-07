type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

// Small deliberate subset of the robots.txt spec: group lines into User-agent
// records, then decide a path by longest-matching rule (Allow or Disallow),
// Allow winning ties — enough to "respect robots.txt; skip if disallowed"
// (SPEC.md F3) without full wildcard globbing.
//
// A record is one-or-more consecutive User-agent lines followed by its rules; the
// FIRST rule line (Allow *or* Disallow) closes the agent list, so the next
// User-agent line starts a new record. Tracking only Disallow here would merge an
// Allow-only "User-agent: *" record into the agent block that follows it — which
// is exactly how a permissive site (User-agent: * / Allow: /) got read as
// disallowed, silently blocking every check.
function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let sawRule = false; // has the current record seen a rule since its last agent line?

  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim(); // preserves colons in the path (URLs)

    if (field === "user-agent") {
      if (!current || sawRule) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRule = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === "disallow" || field === "allow") && current) {
      sawRule = true;
      current.rules.push({ allow: field === "allow", path: value });
    }
  }

  return groups;
}

function selectGroup(groups: Group[], userAgent: string): Group | null {
  const ourAgent = userAgent.toLowerCase();
  const byExactAgent = groups.find((g) => g.agents.some((a) => ourAgent.includes(a) && a !== "*"));
  if (byExactAgent) return byExactAgent;
  return groups.find((g) => g.agents.includes("*")) ?? null;
}

export function isPathAllowed(robotsTxt: string, userAgent: string, pathname: string): boolean {
  const group = selectGroup(parseGroups(robotsTxt), userAgent);
  if (!group) return true;

  // Longest matching rule wins; on an equal-length tie Allow wins (standard
  // behavior). An empty path ("Disallow:" = allow all, "Allow:" = no-op) matches
  // nothing here, so the default stays "allowed".
  let decision = true;
  let matchLen = -1;
  for (const rule of group.rules) {
    if (rule.path === "" || !pathname.startsWith(rule.path)) continue;
    if (rule.path.length > matchLen || (rule.path.length === matchLen && rule.allow)) {
      matchLen = rule.path.length;
      decision = rule.allow;
    }
  }
  return decision;
}
