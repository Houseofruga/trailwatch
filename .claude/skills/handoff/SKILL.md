---
name: handoff
description: Refresh HANDOFF.md with the current build state, then commit and push it, so a different Claude account or a fresh session can continue the TrailWatch/Competitor Radar build without prior chat memory. Use when the user types /handoff, or asks to "update the handoff", "save build state", or "hand off before switching accounts".
---

# /handoff — update the cross-session build state

The repo is the only memory that survives an account switch — per-account
auto-memory does not travel. This skill keeps `HANDOFF.md` (at the repo root) the
single source of truth for "where the build actually is", and pushes it so the
other account sees it on `git pull`.

## Steps

1. **Sync first.** Run `git pull --ff-only` so you're updating the latest state,
   not an old copy. If it fails (diverged/conflict), stop and tell the user — do
   not force.

2. **Survey the current state** rather than trusting memory. Look at what actually
   changed since HANDOFF.md was last updated:
   - `git log --oneline -20` and `git diff` / `git status` for recent work.
   - The `_Last updated:_` line and section contents of the existing `HANDOFF.md`.
   - Spot-check anything the recent commits touched (routes, features, env vars,
     `vercel.json`, `src/features/plan/limits.ts`) so claims are true.

3. **Update `HANDOFF.md` in place** (never create HANDOFF-2.md or parallel notes).
   Keep it the living doc. Refresh at least:
   - `_Last updated:_` → today's date.
   - **Current status** — which `SPEC.md` §7 slices are done; whether the §9
     end-to-end checks have been verified.
   - **Deviations from SPEC.md / CLAUDE.md** — anything the code does that the
     docs don't reflect (e.g. billing is Paddle not Stripe). Add new ones; remove
     any that have been reconciled.
   - **Recent work** — what changed since the last handoff, in plain terms.
   - **Suggested next steps** — the honest to-do for whoever picks it up.
   Keep it concise and factual. If the structure of the existing file works, edit
   its sections; don't rewrite wholesale.

4. **Commit and push.** Stage `HANDOFF.md` (and `CLAUDE.md` if you changed the
   pointer). Commit with a message like `Update HANDOFF.md build state` and the
   standard co-author trailer, then `git push`. The pre-commit hook runs the
   tests — if they fail, report that and do not force the commit.

5. **Confirm** to the user what you recorded and that it's pushed, so they can
   safely switch accounts.

## Notes

- Don't invent progress. If you're unsure whether something works, say "needs
  verification" rather than marking it done.
- This skill only writes `HANDOFF.md` (+ optionally the `CLAUDE.md` pointer). It
  is not for feature work — do the feature work first, then run `/handoff`.
