# Trailwatch marketing: Claude Project for Monisha

Everything needed to set up a Claude Project on claude.ai that knows Trailwatch, so Monisha can write posts, emails and replies and plan outreach.

## Set it up (about 5 minutes)

1. Go to **claude.ai → Projects → Create project**.
   - Name: `Trailwatch marketing`
   - Description: `Posts, outreach and replies for Trailwatch's beta`
2. Click **Set project instructions** (or "Instructions") and paste everything below the line in `00-project-instructions.md`.
3. Under **Project knowledge**, click **+ → Upload from device** and upload:
   - `01-trailwatch-product.md`
   - `02-voice-and-rules.md`
   - `03-outreach-playbook.md`
   - `04-content-templates.md`
   - `05-strategy-and-status.md`
   - Optional: `trailwatch-prospects.csv` (from the repo root) so Claude can suggest brands and categories. The live Prospect tracker stays the source of truth.
4. Fill in the **Status** section of `05-strategy-and-status.md` before uploading, and re-upload it every week or two.

## Good first prompts for Monisha

- "Write this week's Black Friday watch for skincare. Here's what I found: …"
- "Here's a reply from a prospect. What should I say back, and what tracker stage is it?"
- "Draft Chandan's LinkedIn post for Tuesday from this data: …"
- "Write a helpful Reddit answer to this post, no pitch: …"
- "Here are my Friday numbers. What's working and what should I change?"
- "Turn this call note into a thank-you email: …"

## Keeping it current

When something changes (the offer, prices, a new feature, a new channel rule), edit the matching file here and re-upload it in the project (delete the old copy first). Claude only knows what's in these files plus what Monisha pastes into the chat. It can't see the app, the tracker or the inbox.
