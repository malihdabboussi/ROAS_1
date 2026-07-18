---
name: auto-skill-2-roas-strategy-adjust
description: Runs AFTER the onboarding call. Takes the Pre-Call Strategy Map (from auto-skill-1-roas-precall-strategy), the call transcript, and the AM's portal call notes, and produces the final strategy... what the call confirmed, corrected, and added, the finished strategy doc, the portal campaign details, and the client-facing strategy message for their Slack channel. Strategist approves by EOD of the call day, then the message ships. Load whenever an onboarding call just happened... "run strategy adjust," "post-call strategy," "the call's done, finalize the strategy," "here's the transcript, update the map," "build the client strategy message," or a transcript/notes handed over with a pre-call map. Do NOT load before the call (that's auto-skill-1-roas-precall-strategy), for webinar audits (roas-webinar-audit), or for weekly updates.
---

# ROAS Strategy Adjust — call truth in, final strategy out, same day

## AUTOMATION HEADER (agent spec for the bridge)

- **Trigger:** onboarding call completed (status → PRE_LAUNCH), transcript available.
- **Reads:** Pre-Call Strategy Map, call transcript (Fathom), AM's portal call notes, anything the client sent right after (Slack, docs).
- **Produces:** Strategy v2 + delta, portal campaign details, client strategy message.
- **Human checkpoint:** AM fact-checks (facts only, 10 min) → strategist approves by EOD of the call day. Message ships only after approval.
- **Posts to:** strategy doc → client Drive folder + portal Strategist tab; client message → client's Slack channel; delta summary → internal thread.

**Deadline is the feature.** The client was told "full strategy in your Slack by end of day." Skill runs in 20-30 minutes. Don't polish past the deadline.

---

## INPUTS

1. **The Pre-Call Strategy Map** — the hypothesis. Required; if none exists, say so and build v2 from scratch (flag that pre-call was skipped).
2. **Call transcript** — the truth. What the client actually said, decided, invented, and promised.
3. **AM's portal call notes** — the structured facts: checkboxes, budget fields, compliance slider, campaign selections, asset checklist. Notes win on facts; transcript wins on context and intent.
4. **Post-call additions (optional)** — Slack messages, docs, links the client sent after.

Never invent what's missing. Anything undecided goes to OPEN, not to a guess.

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before drafting any client-facing wording. It is the only voice authority for the client strategy message, client recap, approval request, or update produced from this work. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts and vocabulary, but they do not override Dylan Super Voice.

Use Professional Message mode for the client Slack message. Before routing it for approval, run the complete Dylan Super Voice checklist and search the full message for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---

## THE WORKFLOW

### Step 1 — Diff the call against the map
Walk every map claim and every verify-list item and sort into four buckets:
- **CONFIRMED** — the call validated it. Carry it into v2 as fact.
- **CORRECTED** — the client fixed it. The correction replaces the hypothesis, always. Note old → new.
- **NEW** — things the map never saw: decisions made live, offers invented on the call, names, dates, vendor issues, relationships, constraints. This bucket usually holds the most valuable material. Mine the transcript hard for it.
- **OPEN** — verify items the call did NOT resolve, plus new unknowns it created. Each gets an owner and a deadline. If budget wasn't nailed down, it goes here in bold, first.

### Step 2 — Rebuild the strategy
Rewrite the map's recommended play with call truth in it: the locked date(s), the real offer (including anything designed live on the call), the real presenter(s), the real assets, the real constraints (platforms, vendors, capacity, compliance). Show the launch math backwards from the fixed dates (23-day line where it applies). Keep receipts from the map that still stand; kill the ones the call invalidated.

### Step 3 — Extract the promise ledger
Every commitment made on the call, both directions, with owner and due date: what the client owes us (assets, agendas, decisions, access) and what we owe them (plans, timelines, builds). Pull the action items straight from the transcript. This feeds the ClickUp tasks and the "what we need from you" section of the client message.

### Step 4 — Produce the four outputs (per `references/output-template.md`)
1. **Strategy v2 + delta (markdown)** — internal record doc: the four buckets up top (skimmable in 2 minutes), then the full rebuilt strategy.
2. **HTML one-pager** — the same content rendered as one self-contained HTML file, same design language as the pre-call map (see the reference build `Impact-Elite-Strategy-v2.html`): the delta as four color-coded blocks (CONFIRMED green / CORRECTED amber / NEW purple / OPEN red), strategy callout with timeline chips, promise ledger two-up, portal details as a dark mono block, and the client message in a copy-button panel marked "do not post until strategist approves." Single file, inline CSS/JS, no external assets.
3. **Portal campaign details** — paste-ready: campaign 1/2 type, dates, budget, KPIs, offer name/price/LTV, compliance level.
4. **The client strategy message** — for their Slack channel, house style per the template: green light opener → WHAT THE RESEARCH TOLD US (receipts) → THE PLAN (specifics, real ad-line angles) → A FEW THINGS WE NEED FROM YOU (numbered, owners tagged). Written like a sharp human; no promised results.

### Step 5 — Route
AM fact-checks → strategist approves (async, by EOD) → message posts to client channel, doc to Drive + portal, delta to internal thread. Log the OPEN items as tasks with owners.

---

## HARD RULES

- **The call outranks the map, the notes outrank the transcript on facts.** Contradiction between transcript and notes? Flag it, don't pick silently.
- **NEW decisions made live on the call are strategy, not trivia.** An offer invented at minute 39 is now the offer. Capture its exact mechanics.
- **Budget unresolved = the first OPEN item, bolded.** Never bury it.
- **No promised numbers to the client.** Targets framed as targets. "We're aiming for X" is fine; "you'll make X" is banned.
- **Receipts carry over.** Claims in the client message keep their links from the map. New claims need new receipts or they don't ship.
- **Client message passes Dylan Super Voice.** The skill must be loaded, it is the exclusive voice authority, and the complete message must pass its checklist plus the literal em-dash scan. Plain text, Slack-ready.
- **No ad copy from this skill, ever.** The message carries angle DIRECTIONS (who + pain/desire), never quoted ad lines. Finished angles come from the ad kit inside auto-skill-3-roas-launch-brief, after strategy approval.
- **Compliance flags travel.** Anything the map flagged that the call didn't clear stays flagged in v2 and shapes the ad angles.
- **Ship by EOD.** Done and approved beats perfect and late. If the strategist is unreachable, escalate, don't sit.

## COMMON PITFALLS

- **Re-summarizing the call.** This is not minutes. It's a diff plus a decision doc. If a transcript detail doesn't change strategy, tasks, or the message, leave it out.
- **Losing the invented-on-call gold.** The best material is usually improvised live (a new tier, a bundle, a positioning line the client said perfectly). Quote the client's own words where they're better than ours.
- **Letting the map's wrong guesses survive.** CORRECTED means dead. Don't average the hypothesis with the truth.
- **A vague ask list.** "Send us assets" is worthless. Name the asset, the owner, the deadline, and where it goes.
- **Shipping the internal doc to the client.** Only the strategy message reaches them. Risks, fit concerns, and vendor complaints stay internal.
