#!/usr/bin/env bash
# SessionStart hook — warns when the PREVIOUS session left the build state
# un-handed-off, so a fresh session (often a different Claude account) doesn't
# build on stale ground. Checks the local repo only; never fetches, never fails
# the session. Output is injected as session context for Claude to relay.

set -uo pipefail

# Resolve the repo root from this script's location so cwd doesn't matter.
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)"
git -C "$repo" rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

warnings=()

# 1. Uncommitted changes in the working tree.
if [ -n "$(git -C "$repo" status --porcelain 2>/dev/null)" ]; then
  warnings+=("Uncommitted changes are present — the last session may not have finished. Review 'git status'.")
fi

# 2. Local commits not yet pushed to the upstream branch (no fetch).
upstream="$(git -C "$repo" rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"
if [ -n "$upstream" ]; then
  ahead="$(git -C "$repo" rev-list --count "${upstream}..HEAD" 2>/dev/null || echo 0)"
  if [ "${ahead:-0}" -gt 0 ]; then
    warnings+=("$ahead local commit(s) not pushed to $upstream — push before switching accounts.")
  fi
fi

# 3. HANDOFF.md staleness: commits since it was last updated.
if [ -f "$repo/HANDOFF.md" ]; then
  last="$(git -C "$repo" log -1 --format=%H -- HANDOFF.md 2>/dev/null)"
  if [ -n "$last" ]; then
    stale="$(git -C "$repo" rev-list --count "${last}..HEAD" 2>/dev/null || echo 0)"
    if [ "${stale:-0}" -ge 3 ]; then
      warnings+=("HANDOFF.md hasn't been updated in $stale commits — consider running /handoff to capture the latest state.")
    fi
  fi
else
  warnings+=("HANDOFF.md is missing — run /handoff to create the cross-session build state.")
fi

if [ ${#warnings[@]} -gt 0 ]; then
  echo "⚠️  Handoff check (previous session may not have handed off cleanly):"
  for w in "${warnings[@]}"; do echo "  • $w"; done
  echo "If you're picking this up on a different account, run 'git pull' first, then review HANDOFF.md."
else
  echo "✓ Handoff check: working tree clean, everything pushed, HANDOFF.md current."
fi

exit 0
