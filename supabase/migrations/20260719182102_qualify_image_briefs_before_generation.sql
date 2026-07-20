BEGIN;

UPDATE public.skill_library
SET
  description = $description$Turns approved ad concepts, audience and offer context, and a campaign theme into qualification-safe image-generation briefs. Use for image briefs, design prompts, ImageGen prompts, ad-image prompts, or designer handoffs. Requires audience and offer locks, unmistakable category cues, approved-asset readiness, live-platform treatment when factual, and a two-second comprehension check. Do not use to invent concepts, write ad copy, render text-on-texture statics, or assemble final ads.$description$,
  markdown_content = $skill$# ROAS Image Brief — qualified concepts in, paste-ready prompts out

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
$skill$,
  updated_at = now()
WHERE skill_key = 'roas-image-brief';

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES (
  'roas-image-brief',
  'references/design-prompt-spec.md',
  $resource$# Qualification-Safe Design Prompt Spec

A design prompt must produce an image that is visually executable and commercially specific. The viewer should not need the surrounding ad copy to identify the audience or offer.

## Required brief fields

Write these once above the concept set:

1. **Audience Lock** — target category, qualification threshold, insider vocabulary, and explicit exclusions.
2. **Offer Lock** — offer, funnel stage or traffic temperature, delivery format, platform when known, factual timing, and CTA.
3. **Asset Readiness** — approved logos, product/event imagery, cleared people, platform marks, and any missing blocker.

## Required concept fields

Each concept contains:

1. **Format** — requested production ratios, normally 4:5 feed and 9:16 story; add 1:1 only when required.
2. **Audience signals** — one explicit visible category cue plus one independent insider visual, approved person/asset, product, or environment cue.
3. **Scene** — exact subject, setting, framing, focal point, and category-specific evidence.
4. **Style and lighting** — medium, mood, and lighting matched to the Theme.
5. **Palette** — base tones and the exact placement of the brand color.
6. **On-image text** — exact locked words, placement, hierarchy, and accent treatment.
7. **Offer treatment** — delivery format, factual live/platform/date treatment, and CTA relevance for this funnel stage.
8. **Brand and platform assets** — exact approved references and placement. Generate around official marks; never redraw them.
9. **Avoid-list** — generic stock shorthand, clutter, fabricated people or claims, fake logos, and thumbnail failure modes.
10. **Two-Second Test** — the expected cold-viewer answers for who, offer/delivery, and why now.

## Prompt template

```markdown
**Audience signals:** [explicit category cue] + [insider visual/asset cue]
**Design prompt** ([ratios]): [Category-specific scene, setting, framing, and focal point].
[Style and lighting]. [Palette and exact brand-color placement]. On-image text: "[locked words]"
set [placement/hierarchy], with [accent phrase] [treatment]. [Offer/platform/live/date treatment].
[Approved logo/person/product references and placement, or explicit no-logo rule]. Avoid: [failures].
Keep the category and text legible at thumbnail size.
**Two-Second Test:** Who: [target] | Offer: [offer + delivery] | Why now: [factual reason]
```

## Creative routing

- Use the full template for photographic, illustrative, split-frame, or product-led concepts.
- Route text-on-texture identity callouts to `roas-ad-design`, carrying the Audience Lock, Offer Lock, locked line, accent phrase, and approved stamp assets.

## Example — live online training

**Audience Lock:** Established independent dental-practice owners; exclude patients, students, and general entrepreneurs.
**Offer Lock:** Free live Zoom training for practice owners, cold acquisition, factual date and time, register now.
**Asset Readiness:** Cleared instructor headshots, client wordmark, and official Zoom mark attached.

> **Audience signals:** visible “FOR DENTAL PRACTICE OWNERS” badge + cleared instructor inside a recognizable multi-chair dental practice. **Design prompt** (4:5 + 9:16): Confident practice owner reviewing a staffed operatory schedule on a monitor in a bright modern dental office, with treatment chairs and sterilization area visible but secondary. Clean editorial photography with crisp daylight. White and charcoal palette with the brand teal placed on the schedule status bars and headline accent. On-image text: “YOUR PRACTICE SHOULD NOT STOP WHEN YOU STEP OUT” across the lower third, with “STEP OUT” in a teal block. Top badge: “FREE LIVE ZOOM TRAINING FOR DENTAL PRACTICE OWNERS · [DATE/TIME]” with a factual red LIVE indicator; compose the approved client wordmark and official Zoom mark from supplied references. Avoid patients, generic office desks, fake software logos, and stock handshakes. Keep the dental context and text legible at thumbnail size. **Two-Second Test:** Who: dental-practice owners | Offer: free live Zoom training | Why now: scheduled live date/time.

## Example — booked-call campaign

**Audience Lock:** Multi-location home-service operators with dispatch teams; exclude homeowners and solo technicians.
**Offer Lock:** Operations audit booked-call campaign, warm retargeting, no event or live-platform stamp.
**Asset Readiness:** Approved dashboard screenshot and client wordmark attached; no cleared people required.

> **Audience signals:** visible “FOR MULTI-LOCATION OPERATORS” line + approved dispatch dashboard showing several branches and crews. **Design prompt** (4:5): Over-the-shoulder view of the approved dispatch dashboard across three service territories, with one bottleneck route highlighted and branded service vehicles softly visible through the operations-room window. Premium documentary photography, neutral daylight. Slate palette with the brand orange placed only on the bottleneck route and CTA underline. On-image text: “THREE BRANCHES. ONE DISPATCH BOTTLENECK.” in the top third, with “ONE” in an orange block. Lower badge: “BOOK AN OPERATIONS AUDIT.” Place the approved client wordmark from its source asset. Avoid residential consumer imagery, solo tradespeople, generic spreadsheets, and fake dashboard text. **Two-Second Test:** Who: multi-location home-service operators | Offer: operations audit | Why now: an active cross-branch bottleneck.
$resource$,
  'text/markdown'
)
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

UPDATE public.agent_skills AS skill
SET
  name = library.name,
  description = library.description,
  markdown_content = library.markdown_content,
  updated_at = now()
FROM public.skill_library AS library
WHERE skill.skill_key = library.skill_key
  AND skill.skill_key = 'roas-image-brief'
  AND skill.source IN ('system', 'template', 'default');

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT NULL, NULL, skill.agent_key, library.skill_key, library.file_path,
  library.content, library.content_type, NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS library ON library.skill_key = skill.skill_key
WHERE skill.skill_key = 'roas-image-brief'
  AND skill.user_id IS NULL
  AND skill.org_id IS NULL
  AND skill.source IN ('system', 'template', 'default')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type, updated_at = now();

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT NULL, skill.org_id, skill.agent_key, library.skill_key, library.file_path,
  library.content, library.content_type, NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS library ON library.skill_key = skill.skill_key
WHERE skill.skill_key = 'roas-image-brief'
  AND skill.user_id IS NULL
  AND skill.org_id IS NOT NULL
  AND skill.source IN ('system', 'template', 'default')
ON CONFLICT (org_id, agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NOT NULL
DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type, updated_at = now();

INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT skill.user_id, skill.org_id, skill.agent_key, library.skill_key, library.file_path,
  library.content, library.content_type, NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS library ON library.skill_key = skill.skill_key
WHERE skill.skill_key = 'roas-image-brief'
  AND skill.user_id IS NOT NULL
  AND skill.source IN ('system', 'template', 'default')
ON CONFLICT (user_id, agent_key, skill_key, file_path) WHERE user_id IS NOT NULL
DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type, updated_at = now();

COMMIT;
