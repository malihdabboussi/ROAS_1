---
name: roas-webinar-topics
description: Generates 3-5 webinar TITLE + TOPIC options for a ROAS client from a strategy brief (THE PLAN) — each option a named title, a one-line promise subtitle, the 1-3 "you'll discover" teaching points, the identity callout it leads with, and why that angle wins. The first deliverable of the webinar copy package; everything downstream (ads, emails, landing page, deck) inherits the picked title. Load for "webinar topics," "title options," "name the webinar," "what should the webinar be about," "webinar angles," "training title," or any strategy brief paired with a request to pick/present the webinar. Do NOT load to write the emails (roas-webinar-emails), the ads (roas-ad-copy), the landing page (roas-landing-page-copy), or the deck (roas-webinar-deck) — this skill only produces the title/topic options they build on.
---

# ROAS Webinar Topics — 3-5 title options that carry the whole campaign

The webinar title is the campaign's biggest lever: it's the opt-in headline, the ad promise, the email subject spine, and the deck's cover. This skill turns a strategy brief into 3-5 distinct, pick-ready options.

Each option is a different ANGLE on the same offer, not five phrasings of one idea.

## INPUTS
Pull from the brief/conversation first; ask only if genuinely missing.
1. **Client + offer** — what the webinar ultimately sells, and the price point if known.
2. **The buyer** — who registers, in insider specifics (their stuck moment, what they'd never admit).
3. **The big promise** — the outcome the strategy commits to.
4. **The mechanism** — the client's named method/system, if one exists (use it; don't invent one without flagging).
5. **Market research** — if a `roas-market-research` brief exists in the conversation or client docs, use its winning hooks/angles as grounding. If none exists and this is a new campaign, load `roas-market-research` first. Don't write blind.

## THE WORKFLOW

Load `dylans-super-voice` before drafting and confirm it loaded. If it is unavailable, stop and report the missing skill instead of approximating it from memory. Keep it active through the title, teaching bullets, recommendation, and final literal `—` character scan.

### Step 1 — Extract the angle set
From the brief + research, list the distinct angles available: the outcome angle (the result), the enemy angle (what to stop doing / who's lying to them), the mechanism angle (the named system), the identity angle (who this is for), the speed/ease angle (timeline or "without X"). Pick the 3-5 strongest — genuinely different doors into the same room.

### Step 2 — Write each option
Title formula guardrails: specific and outcome-driven beats clever; a number or timeframe beats vague; "without [the thing they hate]" earns registrations; the title must be sayable in an ad. For each option write:
- **Title** — the headline itself (this goes on the opt-in page verbatim)
- **Subtitle / promise line** — one line: what they'll walk away knowing/able to do
- **You'll discover (x3)** — the 1-3 teaching bullets (these become the opt-in bullets and Lesson 1/2/3 on the confirmation page)
- **Leads with** — the identity callout this angle opens on (raw material for Validate Messaging)
- **Why this angle** — one line: the research/strategy reason it wins, and its risk

### Step 3 — Rank and recommend
Order the options strongest-first and say which one you'd run and why, in two lines max. The human gate picks; downstream skills consume the pick.

## OUTPUT FORMAT
```
# [Client] - Webinar Title Options ([date])
**Offer it sells:** ... | **Buyer in one line:** ... | **Grounding:** [research brief used / strategy only — flagged]

## Option 1 - [ANGLE NAME]
**Title:** ...
**Promise:** ...
**You'll discover:** 1) ... 2) ... 3) ...
**Leads with:** ...
**Why this angle:** ...

[Options 2-5...]

## RECOMMENDATION
[the pick + two-line why]
```
Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present.

## HARD RULES
- **Different angles, not synonyms.** If two options could share an ad, cut one.
- **Titles must survive the ad.** If it can't open a Meta ad primary text, it's not a webinar title.
- **Real mechanism only.** Use the client's named system; invented names get flagged `[proposed name]`.
- **Voice.** Titles pass the `dylans-super-voice` no-AI-smell bar — no colon-subtitle academic titles, no "Unlock/Unleash/Master" filler.
- **Grounded.** Research brief or strategy doc behind every angle; no vibes-only options.

## COMMON PITFALLS
- Five phrasings of one angle. The point is a real choice at the gate.
- Clever over specific. "The Empty Calendar Fix" loses to "Book 5 Paid Talks in 30 Days Without Cold Outreach."
- Bullets that repeat the title instead of teasing the teaching.
- Skipping the recommendation — the reviewer wants a default to react to.
