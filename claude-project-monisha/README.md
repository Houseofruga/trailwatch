# Trailwatch marketing: Claude Project for Monisha

Everything needed to set up a Claude Project on claude.ai that knows Trailwatch, so Monisha can write posts, emails and replies and plan outreach.

## Set it up (about 5 minutes)

1. Go to **claude.ai → Projects → Create project**.
   - Name: `Trailwatch marketing`
   - Description: `Posts, outreach and replies for Trailwatch's beta`
2. Click **Set project instructions** (or "Instructions") and paste everything below the line in `00-project-instructions.md`.
3. Under **Project knowledge**, click **+ → GitHub**. Connect the GitHub account that owns `Houseofruga/trailwatch` if asked, pick that repo, and select **only the `claude-project-monisha` folder**. Don't add the whole repo: the code would crowd out the marketing files.
4. Optional: also upload `trailwatch-prospects.csv` (repo root, not on GitHub) with **+ → Upload from device**, so Claude can suggest brands. The live Prospect tracker stays the source of truth.

## How the files stay current

- Whenever Trailwatch changes (features, prices, the offer, dates, links), Claude Code updates the files in `claude-project-monisha/` in the same commit, and `/handoff` checks them too. Once pushed to GitHub, the new versions are ready.
- The project pulls from GitHub **when you click "Sync now"** on the GitHub item in Project knowledge. It doesn't sync by itself, so click it at the start of each week (Monday, before the data post).
- The **Status** section of `05-strategy-and-status.md` (beta members, emails sent, calls) is filled in by Chandan or Claude Code from the tracker, not edited in the project.
- Changing the **instructions** (`00-project-instructions.md`) still means pasting them into the project again; the instructions box doesn't sync.

## Good first prompts for Monisha

- "Write this week's Black Friday watch for skincare. Here's what I found: …"
- "Here's a reply from a prospect. What should I say back, and what tracker stage is it?"
- "Draft Chandan's LinkedIn post for Tuesday from this data: …"
- "Write a helpful Reddit answer to this post, no pitch: …"
- "Here are my Friday numbers. What's working and what should I change?"
- "Turn this call note into a thank-you email: …"

Claude only knows what's in these files plus what Monisha pastes into the chat. It can't see the app, the tracker or the inbox.
