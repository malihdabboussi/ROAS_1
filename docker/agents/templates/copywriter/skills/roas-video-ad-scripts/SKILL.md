---
name: roas-video-ad-scripts
description: Writes clean CLIENT-FACING video ad scripts for ROAS webinar and offer campaigns that clients film themselves. Uses Dylan's Super Voice for natural spoken copy and verified client facts and vocabulary for specificity. Each script is delivered as uninterrupted, unquoted spoken text followed by Shooting instructions and Overlays, with one shared Post-production section for the full set. Load for video ad scripts, client-filmed scripts, UGC or talking-head ads, filming instructions, or what a client should say on camera. Do NOT load to produce AI video, write static ads, or write the webinar itself.
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
Draft with an opening that stops the scroll, a spoken argument or story, and one clean ask. These are internal writing beats, not client-facing labels. Present the final spoken words as one uninterrupted block so the client can read or paste the script exactly as written. Do not put quotation marks around it. If alternate openings are useful, turn them into complete alternate script versions instead of attaching loose hook fragments.

Use short sentences, contractions, and the way this specific person talks. Read-aloud timing rules: ~2.5 words/second; a 30s script is ~70-75 words total, a 60s script is ~145-150. Count them.

### Step 3 — Make it shootable
Per script add:
- **Shooting instructions** — combine delivery, pace, pauses, framing, setting, and lighting into short general directions a non-videographer can follow. Use one setup and make one take sufficient.
- **Overlays** — list the 3-5 caption or text-overlay moments so the editor knows what to burn in.

Put uncleared claims, income promises, or anything the client cannot back in the document's open flags, not between the script and filming directions.

After all scripts, add one **Post-production** section that applies to the full set: caption style, basic cuts, audio cleanup, color treatment, end frame, aspect ratios, and export notes. Do not repeat editing directions under every script.

### Step 4 — Scrub and ship
Load `dylans-super-voice` before drafting and confirm it loaded. If it is unavailable, stop and report the missing skill instead of approximating it from memory. Keep it active through the final scrub. Read every script aloud; anything that does not sound like a person talking gets rewritten. Then search for the literal `—` character and run the complete Dylan's Super Voice anti-AI checklist across the spoken text, overlays, and client instructions. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above. Do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai or an environment without native artifacts, save the markdown deliverable to `/mnt/user-data/outputs/` and present.

## OUTPUT FORMAT
```
# [Client] - Video Ad Scripts ([campaign])
**On camera:** ... | **Destination:** ... | **Grounding:** [research brief / concepts used]
**Open flags:** [uncleared claims or missing facts]

## Script 1 ([15s], ~[38] words)
### Script
[complete spoken text, uninterrupted and without quotation marks]

### Shooting instructions
[delivery, pace, pauses, framing, setting, and lighting]

### Overlays
[overlay moments]

[Scripts 2-4...]

## Post-production (all scripts)
[captions, cuts, audio cleanup, color, end frame, aspect ratios, and exports]

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
- **Client-clean format.** No quotation marks around scripts and no Hook, Body, CTA, Delivery, or Shot + setting labels in the delivered document.

## COMMON PITFALLS
- Writing "copy" instead of speech — if it reads like an ad and not like talking, it fails on camera.
- Blowing the word count; clients speed up and the ad feels panicked.
- Multi-scene scripts a solo founder can't shoot.
- Loose alternate hooks that force the client to reconstruct the script. Make each alternate a complete script version.
- Forgetting the overlay plan; the editor guesses and the CTA never lands on screen.
