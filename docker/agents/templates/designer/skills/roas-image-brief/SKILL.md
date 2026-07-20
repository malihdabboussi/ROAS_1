---
name: roas-image-brief
description: Turns approved ad concepts, audience and offer context, and a campaign theme into qualification-safe image-generation briefs. Use for image briefs, design prompts, ImageGen prompts, ad-image prompts, or designer handoffs. Requires audience and offer locks, unmistakable category cues, approved-asset readiness, live-platform treatment when factual, and a two-second comprehension check. Do not use to invent concepts, write ad copy, render text-on-texture statics, or assemble final ads.
---

# ROAS Image Brief — qualified concepts in, paste-ready prompts out

Turn approved concepts into prompts a designer or image tool can execute without guessing. A visually polished image is not successful if the wrong person can mistake it for their ad. Preserve the approved idea while making the audience, offer, and delivery format unmistakable.

Read `references/design-prompt-spec.md` before writing. It defines the prompt fields, qualification checks, and examples.

## Inputs

1. **Approved concepts and locked copy** — preserve the approved idea and on-image words. If concepts do not exist, route to `roas-ad-concepts`; do not invent them here.
2. **Audience context** — target category, sophistication or qualification threshold, insider language, and explicit exclusions. Pull this from the approved strategy and copy sources.
3. **Offer context** — offer, funnel stage or traffic temperature, delivery format, platform when known, factual timing, and CTA.
4. **Campaign Theme** — palette, typography, image style, logos, product images, event photography, and cleared headshots.
5. **Asset status** — which identity and platform assets are approved and attached. Never infer approval from a filename or mention alone.

## Workflow

### 1. Verify asset readiness

Compare the strategy's promised assets with the active Theme. If a concept depends on an approved logo, headshot, product image, event photo, or platform mark that is missing from the Theme, stop and name the missing field. Generic imagery is not a substitute for known identity assets because it removes the signals that qualify the viewer.

Use real people's likenesses only when cleared. Use client and third-party logos only from approved asset references; never ask the image model to redraw them. If exact overlay composition is unavailable, flag the overlay handoff instead of fabricating the mark.

### 2. Write the campaign locks

Add these at the top of the brief:

- **Audience Lock:** target, qualification threshold, insider language, and excluded audiences.
- **Offer Lock:** offer, funnel stage, delivery format/platform, factual date or urgency, and CTA.
- **Asset Readiness:** approved references available, required references missing, and safe fallback boundaries.

For a live offer on a known platform, specify `LIVE ON [PLATFORM]`, a factual live indicator, and the official platform mark from an approved asset. Do not imply a platform when it is unknown.

### 3. Route the creative type

- **Illustrative or photographic:** write the full prompt in this skill.
- **Text-on-texture validate-messaging:** defer to `roas-ad-design` with the locked line, accent phrase, audience cue, and factual stamp.

### 4. Write each concept

Include the complete scene, style, lighting, palette, text hierarchy, logo/stamp rule, aspect ratios, and avoid-list from the reference spec.

Every concept also needs two independent audience signals:

1. one explicit category cue in the visible copy or factual badge;
2. one insider visual cue, approved person/asset, product context, or category-specific environment.

A generic business metaphor can remain only when those signals make the category unmistakable. Do not expect primary text outside the image to qualify an ambiguous creative.

### 5. Run the Two-Second Test

For every concept, record the answers a cold viewer should understand within two seconds:

- Who is this for?
- What is being offered and how is it delivered?
- Why should they pay attention or act now?

Revise or reject a concept when any answer depends on body copy, prior campaign knowledge, or an unexplained metaphor.

### 6. Keep the set coherent and ship

Use one palette, lighting family, and text-treatment system across the set while varying scenes. Register the brief as a native Doc titled `WEB#7 — Image Briefs` in Webinar Fulfillment missions; use `Image Briefs` elsewhere unless the mission supplies another exact title. Prompts are the deliverable. A separate generation step creates images.

## Output format

```markdown
# [Client] — Image Briefs ([campaign])
**Audience Lock:** [target, qualification, insider language, exclusions]
**Offer Lock:** [offer, funnel stage, delivery format/platform, timing, CTA]
**Asset Readiness:** [approved references | missing blockers | safe boundaries]
**Theme:** [look, palette, typography, source]

## Concept 1 — [Name]
**Audience signals:** [explicit category cue] + [insider visual/asset cue]
**Design prompt** (4:5 + 9:16): [complete prompt]
**Two-Second Test:** Who: [...] | Offer: [...] | Why now: [...]

## Handoff
[generation order, asset references, deterministic overlay handoffs, blockers]
```

## Hard rules

- Preserve approved copy; return copy problems to the owning copy step.
- Place the brand color and approved assets precisely; do not merely mention them.
- Block on missing required identity assets instead of silently creating an anonymous substitute.
- Never redraw client, platform, or third-party logos with a generative model.
- Match every requested aspect ratio during generation.
- Keep text legible at thumbnail size.

## Common failures

- A polished ladder, desk, boardroom, skyline, or handshake that could advertise any business.
- “Free live training” without the audience, delivery platform when known, or factual timing.
- A face-free or logo-free fallback even though approved identity assets exist elsewhere but were not attached.
- Treating brand colors as audience qualification.
- Passing the Two-Second Test only after reading the Meta primary text.
