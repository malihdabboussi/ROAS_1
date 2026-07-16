---
name: roas-webinar-deck
description: Builds the webinar DECK v1 for a ROAS client — a slide-by-slide outline on the proven webinar arc (open/authority → 3 teaching secrets with belief-breaks → transition → offer stack → close/urgency → Q&A close loop), written from the strategy brief + picked title, then handed to the environment's native presentation builder (Vibey presentation actions) with slide-by-slide design directives on approval — PPTX only as a fallback where no presentation capability exists. Outline first for the human gate, design directives + build second. Load for "webinar deck," "build the slides," "presentation for the webinar," "deck v1," "slide the webinar out," "webinar presentation," or a webinar campaign reaching its deck line item. Do NOT load to audit a webinar that already aired (roas-webinar-audit), write the surrounding emails (roas-webinar-emails), process a recording (roas-webinar-prep), or make a non-webinar deck.
---

# ROAS Webinar Deck — outline for the gate, design directives on approval

Two-stage deliverable matching the pipeline's review pattern:
1. **Slide-by-slide outline** (markdown) — every slide's headline, content beats, and speaker note. This is what the human gate reviews.
2. **Design directives + build** — on approval: brand tokens, slide-type system, per-slide layout/emphasis/imagery calls, rendered by the environment's native presentation capability (PPTX fallback only where none exists).

## INPUTS
1. **Client + the picked title/promise/discover-bullets** — from `roas-webinar-topics` or the brief. The three discover-bullets ARE the three teaching secrets; the deck delivers what the opt-in page promised.
2. **The offer** — what's pitched at the end: name, price, stack components, guarantee, bonuses, the show-up bonus promised on the confirmation page. Real numbers only; bracket gaps.
3. **Host + proof** — bio beats, cleared results/testimonials/case studies for the authority open and the proof slides.
4. **Runtime** — default 60 min live (≈35-40 teach, 15-20 offer, Q&A); adjust on request. Slide count follows runtime, typically 40-60 slides.
5. **Brand** — colors/fonts from the campaign theme, the funnel build's mini brand guide, or a site pull. Flag defaults.

## THE WORKFLOW

### Step 1 — Lock the arc
The webinar structure (ROAS house arc, Brunson-informed):
1. **Open** — title slide (the picked title verbatim), the big promise, the show-up bonus reminder, "stay to the end" loop.
2. **Authority** — host story compressed: the before-state, the discovery, the results. Proof early.
3. **The One Thing** — the core belief shift the whole webinar installs.
4. **Secrets 1-3** — one per discover-bullet. Each: the myth they believe → the break (story/proof) → the reframe → the teach. Real teaching, not a content-free tease; the pitch earns trust here.
5. **Transition** — recap the three shifts, "two paths" bridge, permission to pitch.
6. **The Stack** — offer components one at a time, value building, then price drop, guarantee, bonuses (including the attendance bonus), urgency/scarcity that's TRUE.
7. **Close** — CTA slide (the exact next step + link), objection handles (time/money/"will it work for me"), Q&A with the CTA slide persistent.

### Step 2 — Write the outline
Per slide: **headline** (the words on the slide), **beats** (what's on it — bullets, image/proof placeholder, the number), **speaker note** (one-two lines of what the host says/does). Slides carry few words; the host carries the content. Mark every proof slide's source and every `[bracket]`.

### Step 3 — Gate
Present the outline. Stop here in pipeline runs — rendering waits for approval.

### Step 4 — Design directives + build (on approval)
The skill's product is the content and the design direction; the RENDERER is whatever the environment natively builds presentations with.
- Write the **design directive layer** on top of the approved outline — once for the deck: brand tokens (colors/hex, fonts, the look), the slide-type system (title / section-break / teach / proof / stack / CTA layouts); per slide: layout call, emphasis (the word or number that dominates), and imagery note (photo/screenshot/graphic placeholder + one-line suggestion).
- **Vibey / any environment with native presentation creation:** hand the outline + directives to the presentation actions and build there — an editable presentation artifact, not a file export. Do NOT generate a PPTX.
- **claude.ai / no presentation capability (fallback only):** read `/mnt/skills/public/pptx/SKILL.md` and build the PPTX from the same outline + directives; save to `/mnt/user-data/outputs/`.
Either path: present the deck, plus the asset list of what the client owes.

## OUTPUT FORMAT (outline stage)
```
# [Client] — Webinar Deck v1 Outline ([title])
**Runtime:** [60 min] | **Slides:** [~N] | **Offer:** [name @ price] | **Flags:** [brackets, proof gaps]

## Section 1 — Open (slides 1-4)
### Slide 1 — [headline]
Beats: ... | Note: ...
[...every slide, every section...]

## ASSET LIST
[the photos/screenshots/proof the client owes, by slide]

## HANDOFF
[approve → design directives + native build (Vibey presentation actions; PPTX only if no native renderer); the three secrets map 1:1 to the opt-in bullets — confirm they still match]
```

## HARD RULES
- **The title and the three secrets match the funnel verbatim.** The deck delivers the opt-in page's exact promise — drift here kills trust and show-to-close.
- **Real proof, real price, true urgency.** No invented testimonials, no fake countdown scarcity. Bracket what's missing.
- **Teach for real.** Secrets with actual substance; a 40-minute tease is a refund machine.
- **Slides are cue cards, not documents.** The speaker notes carry the talk.
- **Outline gates the build.** No rendering before approval in pipeline runs.
- **Native renderer over file export.** Where the environment builds presentations (Vibey), build there; a PPTX inside Vibey is a dead file.
- **Voice** — slide lines and speaker notes pass the `dylans-super-voice` standard, in the host's voice.

## COMMON PITFALLS
- Deck promises ≠ opt-in promises. Check against the landing page copy before shipping.
- Wall-of-text slides. If the host could read the slide aloud as the talk, split it.
- The stack rushed — one component per beat, value before price, always.
- Skipping objection handles; the close is where the deck earns its keep.
- Rendering before the gate, or exporting a PPTX in an environment with a native presentation builder.
