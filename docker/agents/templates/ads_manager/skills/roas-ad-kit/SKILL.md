---
name: roas-ad-kit
description: One-pass Meta ad launch kit for a ROAS client. In a single deliverable it produces (1) ad CONCEPTS trimmed to exactly visual + on-image text + a paste-ready DESIGN PROMPT each, (2) the VALIDATE MESSAGING angles (4-6 "if you've / if you're a / if your" identity callouts), and (3) 2-4 full META AD VARIATIONS in the six-piece anatomy (primary text/hook, headline, description, overlay, CTA, destination). Use whenever someone wants the whole ad package at once instead of running concepts, copy, and design separately. Triggers on "ad kit," "full ad package," "concepts plus copy," "concepts with design prompts," "run concepts and copy together," "design-ready ad concepts," or any client paired with a request for the complete set of ads to hand to design and a buyer. Load aggressively when the ask spans concepting AND copy AND design in one go; do NOT load when the user wants only one of those (use roas-ad-concepts, roas-ad-copy, or roas-ad-design individually).
---

# ROAS Ad Kit — concepts + angles + copy + design prompts, one pass

This skill bundles the three ad stages into one deliverable so the team gets a launch-ready package without three separate handoffs. It is built directly on the existing ROAS ad skills and reuses their thinking rather than reinventing it. The one genuinely new artifact is a **design-ready prompt attached to every concept** so design (human or image tool) can render with no follow-up questions.

What ships, in this order:
1. **Concepts** — each is exactly: a concept name, the **on-image text**, the **visual**, and a **design prompt**. Nothing else (no mechanism/pole/segment fields in the output).
2. **Validate Messaging angles** — 4-6 labeled identity callouts.
3. **Ad variations** — 2-4 full Meta ads, all six pieces, with what's constant vs. what's tested.

Keep the whole thing skimmable. A buyer and a designer should both be able to act off it immediately.

---

## LEAN ON THE EXISTING SKILLS (don't duplicate them)

Read these before writing. They are the source of truth for the methodology; this skill only changes the *packaging* and adds the design prompt.

- **Mechanism catalog (for concept range):** `roas-ad-concepts/references/concept-mechanisms.md` and `swipe-gallery.md`. Generate concepts across DIFFERENT mechanisms so each stops a different person. This range happens internally even though the output is trimmed.
- **Validate Messaging:** `roas-ad-copy/references/validate-messaging.md`. 4-6 lines, each a different segment, same offer underneath.
- **Ad anatomy + hooks:** `roas-ad-copy/references/ad-anatomy.md`. The six pieces; the hook carries the click and truncates ~125 chars.
- **Ad Library research:** `roas-ad-copy/references/ad-library-research.md`. Required grounding step (below).
- **Master copy standard:** load `dylans-super-voice`. Every line that ships passes its Human Enforcement layer.
- **Design prompt spec (new, in this skill):** `references/design-prompt-spec.md`. How to write the per-concept design prompt.
- **Worked example (in this skill):** `references/output-example.md`. The exact output shape, condensed. Match it.

If a sibling reference isn't present in the environment, the summaries in this file are enough to proceed; note the gap and continue.

---

## INPUTS — gather before building

Pull from the conversation/brief first; only ask if genuinely missing. Use clearly-marked placeholders for gaps, never invent the offer, the buyer, or proof.

1. **Client + page name + voice** — whose page the ads run from.
2. **Offer + funnel + destination** — what the ad drives to (VSL, opt-in, application, webinar) and the URL; the CTA button.
3. **The big promise** — the core outcome the offer delivers.
4. **The real buyer + their insider pains** — the specific stuck moments, rituals, and the thing they'd never admit. This is the raw material for concepts and angles. Push for specifics.
5. **Proof that's real and cleared** — names, roster, ratings, results the client can actually back. Never fabricate testimonials or numbers. Honor any names the user has told you to exclude.
6. **Brand visuals** — brand color(s)/hex, look (premium/dark/bright), existing creative, available b-roll/photos. Feeds the design prompts.
7. **Compliance flags** — anything income/health/protected-attribute related to keep aspirational or drop.

---

## THE WORKFLOW

### Step 1 — Market research (required grounding, keep it tight)
**Load the `roas-market-research` skill and run it first.** It pulls real competitor ads through the connected SearchAPI (Ads Intelligence) and Scrape Creators MCPs — Meta, Google, TikTok, LinkedIn — ranks them by longevity, and pulls transcripts of winning video ads. Its References section drops directly into Section 1 of this deliverable (same six fields: hook, identity angle, creative format, CTA, longevity, borrow-vs-counter).

If `roas-market-research` isn't installed or both MCPs are unavailable, fall back to the legacy method per `ad-library-research.md`: web-search the competitors and the offer category, or ask for screenshots. Either way: 3-5 references minimum, and don't write blind.

### Step 2 — Concepts across mechanisms, then trim to ship
Generate 5-8 concepts spread across DIFFERENT mechanisms from the catalog (insider-ritual, quiet evidence, split life, mismatch, belief reversal, stop/start, literalize-the-abstract, status reframe). Cover both emotional poles (some fear/recognition, some aspiration/status). Pressure-test each against the scroll test, the screenshot test, the mind-read test, the could-be-anyone test, and the visual-does-work test. Keep only the ones that clear the bar.

Then output each surviving concept in exactly this shape (see `references/output-example.md`):

```
### [Concept name]
- **Text (on-image):** "[the exact words that ship]" — accent: [WORD/PHRASE]
- **Visual:** [one line: what the image literally is]
- **Design prompt:** [a complete, paste-ready art-direction prompt per references/design-prompt-spec.md]
```

The mechanism, pole, and segment are decided internally for range and to tie concepts to the angles, but they are NOT printed in the output. The output is visual + text + design prompt only.

### Step 3 — Validate Messaging angles
Per `validate-messaging.md`, write 4-6 identity callouts, each "If you've / if you're a / if your" + a specific person and situation + the same offer promise. Vary the entry point (role, life-stage, pain, hidden strength, belief, aspiration) so each catches a different person. Label the segment each one targets. Pull situations from the research and the real buyer, not imagination.

### Step 4 — Ad variations (2-4 full ads)
Per `ad-anatomy.md`, build 2-4 full ads off the best concepts/angles, each leading with a different identity. Each ad ships all six pieces:
- **Primary text** (hook in the first line, lands before the ~125-char fold; then expand → promise → proof → CTA line)
- **Headline** (~40 chars, states the offer/outcome)
- **Description** (~30 chars, optional secondary detail)
- **Overlay copy** (the on-image line for that ad's concept + accent treatment + any stamp)
- **CTA button** (Meta preset: Learn More / Sign Up / Apply / Register)
- **Destination** (the URL the click goes to)

State plainly what's **constant** across all variations (offer, destination, CTA, proof block, voice) and what's being **tested** (hook, identity, concept/overlay) so the buyer runs a clean test.

### Step 5 — Scrub, then output
Run every shipping line (concept on-image text, angles, all six ad pieces) back through the human-copy standard. Hunt the high-frequency tells: em dashes, rhythmic triplets, "it's not X it's Y," question-then-list, fake-candor openers, forbidden words, round-number tells. Fix in place. The design-prompt paragraphs are art direction, not ad copy, so they don't need the no-em-dash treatment, but keep them clear.

---

## OUTPUT FORMAT — use this exact structure

```
# [Client] — Meta Ad Kit (Round [N])

**Buyer in one line:** [the insider read on who this calls out]
**Flags / assumptions:** [funnel + destination, proof rules, any excluded names, compliance flags, missing inputs]

## 1. Ad Library research
[3-5 tight references: hook / angle / CTA / longevity / borrow-or-counter]

## 2. Concepts
[5-8 concepts, each: name → Text (on-image) + accent → Visual → Design prompt]

## 3. Validate Messaging angles
[4-6 labeled identity callouts]

## 4. Ad variations
[constants vs. tested, then 2-4 full ads in the six-piece anatomy]

## HANDOFF
[which 2-3 to run first and why; note that concepts are design-ready as written and angles can be rendered by roas-ad-design; biggest available proof lift]
```

Deliver per environment: in a platform with native document artifacts (Vibey), register the markdown as a Doc artifact (`document_artifact`) with the title above — do not write to `/mnt/user-data/outputs/` inside the platform. In claude.ai / no native artifacts (fallback), save to `/mnt/user-data/outputs/` and present. Offer a DOCX only outside the platform / if asked.

---

## HARD RULES

- **Real proof only.** No invented testimonials, names, or results. Honor every exclusion the user gave (e.g., a name they said to keep out).
- **Concept output is three fields.** Visual, on-image text, design prompt. Don't pad it back out with mechanism/pole/segment in the printed output.
- **Validate Messaging ships every time**, even if unasked. 4-6 distinct identities, not five flavors of one.
- **Research before writing.** 3-5 references, grounded, tight.
- **Every shipping line passes the human-copy standard.** Meta punishes AI smell with worse relevance and CPM.
- **Client's voice**, first person, for the ad copy. Not the agency's voice, not a generic brand voice.
- **Flag, don't fudge.** Borderline income/health/protected-attribute claims get flagged for the client to confirm, not silently shipped.

---

## COMMON PITFALLS

- **One mechanism, many coats of paint.** The concept set's whole value is range. Spread across mechanisms.
- **Vague design prompts.** "Make it premium" is not design-ready. The prompt must name the scene, style, palette, the exact on-image text and its placement, the accent treatment, and the format — enough that a designer or image tool needs no follow-up. See `references/design-prompt-spec.md`.
- **Decorative concept visuals.** A smiling person on a gradient is wallpaper. The visual literalizes an idea or proves a pain.
- **Burying the hook.** First line of primary text carries the click and truncates ~125 chars.
- **A copy blob.** Deliver the six labeled pieces per ad, not a paragraph the buyer must disassemble.
- **Skipping research or angles.** Both are required, every time.
