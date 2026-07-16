---
name: roas-image-brief
description: Turns approved ad concepts + a campaign theme into paste-ready IMAGE GENERATION design prompts (ChatGPT ImageGen / any image tool) in the ROAS design-prompt spec — one complete paragraph per concept covering scene, style, lighting, palette with the campaign's brand color placed, exact on-image text with accent-word treatment, logo/stamp rule, and avoid-list, tagged 4:5 + 9:16. The isolated design-prompt layer of roas-ad-kit. Load for "image briefs," "design prompts," "ImageGen prompts," "prompts for the ad images," "turn these concepts into image prompts," "creative briefs for the designer," or a concept set + brand/theme handed over for the image layer. Do NOT load to invent the concepts (roas-ad-concepts), write the ad copy (roas-ad-copy), or render text-on-texture creatives (roas-ad-design — route those there instead).
---

# ROAS Image Brief — concepts in, paste-ready ImageGen prompts out

The design-prompt layer of `roas-ad-kit`, isolated. Input: approved concepts + the campaign theme. Output: one prompt per concept that a designer or an image tool can execute with zero follow-up questions.

**The spec is bundled and canonical:** read `references/design-prompt-spec.md` before writing. Every prompt carries all seven elements (format tag, scene, style & lighting, palette + brand color placement, on-image text + accent treatment, logo/stamp rule, avoid-list) and matches the worked examples' specificity.

## INPUTS
1. **The concepts** — from `roas-ad-concepts`, an ad-kit deliverable, or stated in the conversation. Each needs at minimum: the idea, the on-image line, and the visual direction. If concepts don't exist yet, run `roas-ad-concepts` first — this skill literalizes ideas, it doesn't invent them.
2. **Campaign theme** — brand color(s) with hex, the look (dark premium / bright clean / editorial / gritty), fonts if they matter to the creative. From the client's brand pull, the strategy doc, or the funnel build's mini brand guide. If only a client site is given, `web_fetch` it and extract; flag defaults as defaults.
3. **Stamp rule** — webinar campaigns usually carry a FREE TRAINING / date stamp; book-a-call and application funnels usually don't. Confirm from the campaign type.
4. **Locked on-image copy** — if `roas-ad-copy` already locked overlay lines, use them verbatim; the prompt never rewrites copy.

## THE WORKFLOW

### Step 1 — Sort the concepts by creative type
Per the spec's two types:
- **Illustrative/photographic** (metaphor object, staged scene, split-frame) → full scene-brief prompt. This skill's main output.
- **Text-on-texture validate-messaging lines** → do NOT write a full prompt; output the short deferral line "→ render via roas-ad-design" with the line, the accent word, and the stamp rule. That renderer owns those conventions.

### Step 2 — Write each prompt
One paragraph per the spec template, formats tagged 4:5 + 9:16 (add 1:1 only if the placement calls for it). Literalize the concept: the exact subject, setting, framing, focal point. Place the brand hex somewhere specific (an underline, a prop, a color block) — never "use brand colors." State the exact on-image words, their placement, and which word gets the marker/bold/block treatment. Close with the avoid-list (stock smiles, clutter, fake logos, thumbnail legibility).

### Step 3 — Consistency pass
Across the set: same palette family, same lighting mood, same text treatment language — the campaign should look like ONE campaign in the feed. Vary the scenes, not the system.

### Step 4 — Ship
### Output (environment-aware)
**Vibey / native artifacts:** save Doc `"Image Briefs"` via `save_document`. Prompts are the deliverable; do not generate the images unless asked (and if asked, the text-on-texture ones still route to roas-ad-design). Do NOT write to `/mnt/user-data/outputs/`.
**claude.ai fallback:** save to `/mnt/user-data/outputs/` and present.

## OUTPUT FORMAT
```
# [Client] — Image Briefs ([campaign])
**Theme:** [look, brand color + hex, source] | **Stamp rule:** [yes: line / no] | **Concepts in:** [N] ([M] photographic, [K] → roas-ad-design)

## Concept 1 — [Name]
**Design prompt** (4:5 + 9:16): [the complete paragraph per the spec]

## Concept 2 — [Name] (text-on-texture)
→ render via roas-ad-design: line "[...]", accent "[WORD]", [stamp rule].

[...all concepts...]

## HANDOFF
[paste order; any concept whose scene needs a real asset (product shot, cleared face) flagged]
```

## HARD RULES
- **Spec-complete or not done.** A prompt missing the palette, the text placement, or the avoid-list forces the designer to guess — the exact failure this skill exists to kill.
- **Copy is locked.** On-image words come from the concept/ad-copy verbatim; the prompt never rewrites them.
- **Brand color is placed, not mentioned.** Name the hex and say where it lands.
- **Text-on-texture routes to roas-ad-design.** Don't re-spec what the renderer owns.
- **No real people's likenesses** unless cleared; no regenerated real-brand logos; faces avoided by default in metaphor scenes.
- **Thumbnail legibility** stated in every prompt.

## COMMON PITFALLS
- Vibes prompts ("premium studio feel, brand colors") — the worked examples in the spec are the bar.
- Writing full scene briefs for validate-messaging lines that belong to roas-ad-design.
- Inventing on-image copy the ad-copy skill never wrote.
- A set with five different moods — one campaign, one look.
- Generating images when the ask was briefs.
