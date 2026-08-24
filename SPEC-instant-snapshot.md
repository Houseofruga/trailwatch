# SPEC — Instant Baseline Snapshot (onboarding Fix 1)

> Feature addendum to `SPEC.md`. Goal: deliver visible value at the moment a page is added,
> instead of making the user wait for the first daily check. When a user adds a page, we
> fetch it **immediately**, store that capture as the baseline, and confirm it on screen.
> Small, contained change — it reuses the existing check logic (F3). Do not expand scope.

---

## 1. Why

Today, adding a page produces nothing visible until the next cron run — the dashboard looks
empty and the user leaves before any value arrives. This makes signup produce an immediate,
tangible result: "we captured this page, and we're now watching it."

---

## 2. Behavior

When a user adds a page (URL + label), on submit:

1. **Validate** the URL first (public `http`/`https`, well-formed). If invalid, reject inline —
   do not create the page (see copy §4).
2. **Enforce plan limits** before doing any network work. If over limit, block with the existing
   upgrade prompt — no fetch.
3. **Create the page** record (active, checking daily).
4. **Immediately run the existing check logic (F3):** fetch the URL, extract + normalize the main
   content, and store it as the page's **first snapshot** (the baseline).
   - This baseline is exactly what future daily checks diff against — it is not throwaway work.
   - **Do NOT** create a `change` row and **do NOT** call the LLM summariser on this baseline.
     There is nothing to compare yet; baseline = store snapshot only.
5. **Surface the result** in the UI (see states §3).

The fetch is attempted right away with a sensible timeout (~8–10s). Keep the implementation simple:
an API route that performs the capture and returns success/failure; the UI awaits it with a
loading state and falls back gracefully on timeout.

---

## 3. UI states (add-a-page flow)

1. **Input** — URL + label fields, "Add page" button (existing).
2. **Capturing** — after submit: button disabled, spinner, `Capturing {label}…` with subtext
   `Taking a first snapshot so we can spot changes.`
3. **Captured (success)** — the page appears in the list with the existing `Checking daily` badge,
   plus a confirmation message (§4). Optional (nice-to-have, not required): a "View snapshot" link
   or a one-line text preview of the captured content, to make the capture tangible.
4. **Couldn't reach (soft fail)** — the page is **still added**, shown with a subtle warning state
   and a `Retry now` action. The next daily check will attempt it again automatically.
5. **Invalid URL (validation, pre-create)** — inline error, page **not** created.

The user is never blocked from adding a page by a failed fetch — only by an invalid URL or a plan
limit.

---

## 4. Copy (exact strings — plain, calm, confident; match existing UI voice)

- **Capturing:** `Capturing {label}…` · subtext `Taking a first snapshot so we can spot changes.`
- **Success:** `✓ Captured {label} as of {date}. We'll alert you the moment it changes.`
  (e.g. "Captured Pricing as of Aug 21, 2026.")
- **Couldn't reach (soft fail):** `Added {label}, but we couldn't reach it yet. We'll keep trying —
  next check is tonight.` + `[Retry now]`
- **Couldn't read content (soft fail):** `Added {label}, but we couldn't read this page's content
  yet. We'll retry on the next check.`
- **Invalid URL:** `That doesn't look like a valid web address. Use the full https:// link.`

---

## 5. Data / logic notes

- Reuse the F3 fetch/extract/normalize/snapshot code — do not write a second copy.
- A page with a failed initial fetch simply has no snapshot yet; the daily cron already handles
  "no prior snapshot → store baseline, no change row," so the soft-fail path needs no special cron
  logic — it converges on the next run.
- `Retry now` re-runs the same capture on demand for that one page.

---

## 6. Out of scope (do NOT build here)

Screenshot/visual preview · diffing or "changes" on first add (nothing to compare) · retry
scheduling beyond "next daily check" + the manual `Retry now` button · de-duplicating repeated
URLs. Keep this to: immediate fetch on add + the states and copy above.

---

## 7. End-to-end verification (definition of done)

1. Adding a reachable page shows `Capturing…`, then the success confirmation with today's date,
   and the page appears with `Checking daily`.
2. A baseline snapshot is stored for that page, and **no** `change` row and **no** LLM summary are
   created on add.
3. Adding an unreachable/blocked page still creates the page, shows the soft "couldn't reach —
   will retry" state, and `Retry now` (or the next daily check) successfully captures it.
4. Entering an invalid/non-`http` value is rejected inline and no page is created.
5. A user at their plan's page limit is blocked before any fetch, with the existing upgrade prompt.
