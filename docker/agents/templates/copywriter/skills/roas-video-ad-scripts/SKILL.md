---
name: roas-video-ad-scripts
description: Writes CLIENT-FACING video ad scripts for ROAS webinar/offer campaigns — scripts the client films themselves on a phone (talking-head/UGC style), not AI-produced video. Each script is a shootable package — word-for-word lines with a timed hook, delivery notes a non-videographer can follow, a simple shot/setting note, and the caption-overlay + CTA plan. Produces 2-4 scripts across lengths (15/30/60s) and hook variants. Load for "video ad scripts," "scripts for the client to film," "UGC script," "talking head ad," "what should [client] say on camera," "film-it-yourself ad," or a campaign's video-ads line item when production is human, not AI. Do NOT load to produce/animate video with Higgsfield (roas-video-ads), write static ad copy (roas-ad-copy), or write the webinar itself.
---

# ROAS Video Ad Scripts — written for a client, a phone, and one take

The deliverable is scripts a real person can shoot without a crew: exact words, simple direction, no jargon. The client (or their team) films; we hand them everything else. If the campaign later wants AI production, `roas-video-ads` consumes these same scripts — but that is not this skill's job.

## INPUTS
1. **Client + offer + the picked webinar title/promise** (or the offer's CTA if not a webinar).
2. **Research/angles** — the `roas-market-research` brief and/or `roas-ad-concepts` output if present. Winning video hooks and transcripts from research are gold — model their structure, never their lines. If no research exists for a new campaign, run `roas-market-research` first.
3. **Who's on camera** — the founder/host, a team member, or a customer. Their speaking style if known (punchy? warm? contrarian?).
4. **Lengths + count** — default: 3 scripts (one 15s hook-and-CTA, one 30s, one 60s story), plus 2 alternate hooks for the winner-format. Adjust on request.
5. **CTA** — the exact destination and ask ("register free at [link]", "comment WEBINAR").

## THE WORKFLOW

### Step 1 — Pick the formats
From research + offer, choose each script's format: direct-to-camera callout, micro-story ("six months ago I..."), contrarian teardown ("stop doing X"), or objection-flip. Different formats across the set — this is the test matrix.

### Step 2 — Write each script
Structure per script:
- **HOOK (0-3s)** — the scroll-stopper, first words out of their mouth. Identity callout or pattern interrupt. This line does 80% of the work; write 2 alternates for at least one script.
- **BODY** — the promise/mechanism/story, in spoken language: short sentences, contractions, the way this specific person actually talks. Read-aloud timing rules: ~2.5 words/second; a 30s script is ~70-75 words total, a 60s is ~145-150. Count them.
- **CTA (last 3-5s)** — the exact ask, once, clean.

### Step 3 — Make it shootable
Per script add:
- **Delivery notes** — energy, pace, where to pause, which line to punch. Plain language ("say this like you're annoyed for them").
- **Shot + setting** — one setup only: framing (chest-up, phone at eye level), location suggestion, lighting in one line (face a window). No multi-shot edits, no b-roll dependencies — one take must be enough.
- **Overlay plan** — the 3-5 caption/text-overlay moments (hook text on screen, the key number, the CTA end frame) so the editor knows what to burn in.
- **Do NOT say** — claims to avoid on camera (uncleared results, income promises, anything the client can't back).

### Step 4 — Scrub and ship
Read every script aloud in your head; anything that doesn't sound like a person talking gets rewritten. Full `dylans-super-voice` no-AI-smell pass. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present.

## OUTPUT FORMAT
```
# [Client] — Video Ad Scripts ([campaign])
**On camera:** ... | **CTA:** ... | **Grounding:** [research brief / concepts used]

## Script 1 — [FORMAT] ([15s], ~[38] words)
**HOOK (0-3s):** "..."
  Alt hook A: "..." | Alt hook B: "..."
**BODY:** "..."
**CTA:** "..."
**Delivery:** ...
**Shot + setting:** ...
**Overlays:** ...
**Do not say:** ...

[Scripts 2-4...]

## FILMING NOTES (once, for the client)
[phone setup, window light, 3 takes per script, send raw files — five plain lines max]

## HANDOFF
[which script to film first; note: if AI production is ever wanted, roas-video-ads consumes these as-is]
```

## HARD RULES
- **Spoken words, counted.** Every script fits its runtime at talking pace. A 30s script at 110 words is a rejected deliverable.
- **One take, one setup.** If it needs an editor to make sense, rewrite it.
- **Their mouth, their voice.** Written the way the on-camera person talks; no marketing-ese a human would trip over.
- **Real claims only.** Uncleared numbers/results go in "Do not say," not in the script.
- **Model research structure, never lines.** Competitor transcripts inform the shape; the words are original.
- **Scripts, not production.** No Higgsfield, no generation — that's roas-video-ads.

## COMMON PITFALLS
- Writing "copy" instead of speech — if it reads like an ad and not like talking, it fails on camera.
- Blowing the word count; clients speed up and the ad feels panicked.
- Multi-scene scripts a solo founder can't shoot.
- One hook per script — the hook is the test; give alternates.
- Forgetting the overlay plan; the editor guesses and the CTA never lands on screen.
