type Group = { agents: string[]; disallows: string[] };

// Small deliberate subset: groups lines by User-agent block, blocks a path if
// any Disallow prefix in the applicable group matches. No Allow overrides, no
// wildcard globbing — SPEC.md F3 only asks to "respect robots.txt; skip and
// log if disallowed," and this covers the common case.
function parseGroups(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const rawLine of robotsTxt.split("\n")) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;

    const [rawField, ...rest] = line.split(":");
    const field = rawField.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (field === "user-agent") {
      // A User-agent line right after directives starts a new group; back
      // to back User-agent lines extend the current one.
      if (!current || current.disallows.length > 0) {
        current = { agents: [], disallows: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (field === "disallow" && current) {
      current.disallows.push(value);
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

  return !group.disallows.some((prefix) => prefix !== "" && pathname.startsWith(prefix));
}
