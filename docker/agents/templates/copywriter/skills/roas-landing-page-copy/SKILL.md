---
name: roas-landing-page-copy
description: Writes the COPY for a webinar registration funnel's front two pages — the Opt-In (registration) page and the Registration Confirmation (thank-you) page — for a ROAS client, from a strategy brief + picked webinar title. Full copy for every block (headlines, bullets, CTAs, host bio, confirmation steps) plus the per-page section guide and mini brand guide in the exact handoff format roas-funnel-design consumes. The isolated landing-page unit of the webinar pipeline. Load for "landing page copy," "registration page," "opt-in page," "write the LP," "thank-you page copy," "webinar page copy," or a webinar campaign needing its pages written. Do NOT load for a FULL multi-page funnel build (offer/replay/purchase pages — that's roas-funnel-build), to render/design the pages (roas-funnel-design), or to write ads or emails.
---

# ROAS Landing Page Copy — the webinar funnel's front door, written

The extracted landing-page unit of `roas-funnel-build`, scoped to the two pages a webinar campaign needs at launch: **Opt-In** and **Registration Confirmation**. Output lands in the exact section-guide + brand-guide + copy shape that `roas-funnel-design` renders with zero adaptation.

If the ask grows to offer/replay/purchase pages or a non-webinar funnel, that's `roas-funnel-build` — hand off, don't sprawl.

## INPUTS
Pull from the brief/conversation first. Use `[brackets]` for true gaps; never invent the offer, proof, or price.
1. **Client + site** — for voice and brand extraction.
2. **The picked webinar title + promise + discover-bullets** — from `roas-webinar-topics` or the brief. If no title is picked, run that skill (or ask) first; the opt-in headline IS the title.
3. **Date/time/platform** — live vs evergreen, timezone lines.
4. **Host bio + proof** — real credentials, real "as seen on," real photo availability. Cleared testimonials only.
5. **Community/calendar links** — the confirmation page's engagement steps (calendar add, community join). Bracket if unknown.
6. **Brand** — `web_fetch` the client site and pull real colors (hex) + fonts per `roas-funnel-build/references/design-handoff.md` conventions; or use supplied assets; or flag neutral defaults. Never guess a hex and present it as the client's.

## THE WORKFLOW

### Step 1 — Skeleton
Use the webinar wireframe (Pages 1-2 of `roas-funnel-build/references/wireframe-webinar.md` if installed; otherwise the block lists below) as the fixed structure. Structure is locked; the words are the work.

**Opt-In blocks:** top bar (logo + "Attention [audience]") → hero (pre-head + MAIN HEADLINE = the webinar title + discover line + date/time) → CTA button + subtext → urgency line + countdown → authority ("MEET YOUR HOST" / "AS SEEN ON") → host bio (2-3 paragraphs + photo) → footer.
**Confirmation blocks:** logo → "you're almost registered" headline → welcome-video note → date/time reminder + restated promise + countdown → Step 1 add-to-calendar → Step 2 join community → Step 3 what you'll learn (Lesson 1/2/3 = the discover-bullets, one line each) → bonus tease (show-up gift) → footer.

### Step 2 — Write every block
Full copy, no stubs: headlines, subheads, bullets, button text, form labels, the urgency line, the host bio, the three lessons, the bonus tease. The client's voice, first person where the page speaks as the host. The confirmation page's whole job is show rate — calendar, community, and the attendance bonus are the levers; write them like they matter.

### Step 3 — Design handoff
Once for the deliverable: **mini brand guide** (font pairing, colors + hex with source noted, button style, overall look). Per page: **section guide** — the stacked blocks in order with one line on what each holds. Match `roas-funnel-build`'s handoff format exactly; this is what `roas-funnel-design` ingests.

### Step 4 — Scrub and ship
Every shipping line through the `dylans-super-voice` no-AI-smell standard (em dashes, triplets, "it's not X it's Y," fake-candor openers — hunt and fix). Section-guide notes are instructions, not copy; they're exempt. Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present.

## OUTPUT FORMAT
```
# [Client] — Webinar Landing Pages ([webinar title])
**Flow:** Opt-In → Registration Confirmation | **Date/time:** ... | **Flags:** [brackets, brand source, missing proof]

## Page 1 — Opt-In (Goal: capture registration)
[full copy, every block]

## Page 2 — Registration Confirmation (Goal: raise show rate)
[full copy, every block]

## Design handoff
### Mini brand guide
[fonts, colors/hex + source, button style, look]
### Section guide — Opt-In
[blocks in order, one line each]
### Section guide — Confirmation
[blocks in order, one line each]

## HANDOFF
[proof gaps to fill; note: render via roas-funnel-design; offer/replay pages via roas-funnel-build when needed]
```

## HARD RULES
- **The title is the headline.** Don't rewrite the picked webinar title on the page; downstream consistency is the point.
- **Real proof only.** Bio credentials, logos, testimonials — cleared and true, or bracketed.
- **Both pages ship complete.** No "confirmation page TBD."
- **Client's real brand or flagged defaults.** Pull it, don't guess it.
- **Copy + handoff only.** No rendering, no HTML — that's roas-funnel-design.
- **No-AI-smell standard on every shipping line.**
- **Flag, don't fudge** borderline income/results claims (FTC).

## COMMON PITFALLS
- Writing a new headline instead of using the picked title.
- A thin confirmation page — it's the show-rate engine, not a receipt.
- Handoff format drift — funnel-design expects the build skill's exact shape; keep it.
- Scope creep into offer/replay pages — hand to roas-funnel-build.
- Placeholder proof everywhere instead of pulling what's real.
