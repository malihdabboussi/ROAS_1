-- Ad Creative skills rewrite — image-first + 10-strategy library (Phase 2)

UPDATE agent_skills
SET markdown_content = '## Ad Creative System (Image-First)

You create high-converting Meta ad creatives using the same image-first primitives as the Ad Creative Canvas. TSX templates are deprecated — generate images, then optional overlay TSX only when precision text is required.

## Phase 1 — Read Context (mandatory before any creation tool call)

1. `get_narrative_pages` — brand voice, positioning, past ad decisions, ICP language
2. `search_memory` — only for facts not in narrative pages
3. `search_campaign_knowledge` — when a campaign is active
4. `search_company_cortex` — when org scope applies (copy standards, anti-patterns)
5. `list_offers` + `get_offer`, `list_avatars` + `get_avatar`, trust ACTIVE_THEME or `list_themes`

Skip reads already present in injected brain context.

## Phase 2 — Choose Strategy

Use the 10-strategy library (same keys as canvas):

- **Visual Contrast** (`visual_contrast`) — Side-by-side before/after — pain state vs winning state.
- **Founder Authority** (`founder_authority`) — Face + credibility + bold promise.
- **Product Hero** (`product_hero`) — Product or offer as the visual anchor.
- **UGC Native** (`ugc_native`) — Looks like an organic creator post — low polish, high trust.
- **Bold Offer** (`bold_offer`) — Direct response — the offer itself is the hook.
- **Social Proof** (`social_proof`) — Testimonials, numbers, screenshots, proof stack.
- **Problem / Symptom** (`problem_symptom`) — Dramatize the pain visually.
- **Transformation** (`transformation`) — Aspirational end state — who they become.
- **Comparison** (`comparison`) — Old way vs new way.
- **Curiosity Pattern Interrupt** (`curiosity_pattern`) — Weird/specific visual that stops scroll.

Default for multi-ad: 2–3 strategies × 2–3 variations = 4–9 ads.

## Phase 3 — Generate Creative (image-first)

- New image: `generate_image` with composed prompt from strategy skeleton + brain specifics
- Edit / image-to-image: `edit_image` with `parent_image_asset_id`
- Carousel: multiple images + structured `carousel_cards`
- Video: `generate_video` with first-frame image
- Overlay: optional `generated_tsx` for precision headlines when the bitmap cannot carry text

## Phase 4 — Save and Explain

- `bulk_create_ads` or N × `create_ad` with `image_url`, copy, `metadata.creative_strategy`
- Brief the user: what was created, which strategy, which brain insight drove it

## Canvas Operator Mode

When the user message is a `ad_creative_canvas_delegate` envelope (`node_id`, `canvas_id`, `intent`, `user_brief`):

1. Still run Phase 1; also `list_canvas_nodes` for sibling coherence
2. If `strategy_key` is set, use it; else pick from library
3. `generate_image` (intent generate) or `edit_image` (intent edit) **with `canvas_node_id`** — do NOT `create_ad` in canvas mode
4. Emit short status lines: "Reading your brain", "Choosing strategy: X", "Crafting prompt", "Generating image", "Done"

Read `references/canvas-operator.md`, `references/brain-protocol.md`, `references/image-edit-protocol.md`, `references/prompt-craft-playbook.md`, and `examples/strategies/*.md`.',
    updated_at = now()
WHERE skill_key = 'ad-builder' AND agent_key = 'vibey' AND user_id IS NULL;

DELETE FROM agent_skill_resources
WHERE skill_key = 'ad-builder'
  AND agent_key = 'vibey'
  AND user_id IS NULL
  AND file_path LIKE 'examples/ads/templates/%';

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES
  ('vibey', 'ad-builder', NULL, 'examples/ads/INDEX.md', 'text/markdown', '# Ad Strategy Index

Use the 10 image-first strategies in `examples/strategies/`:

- **Visual Contrast** (`visual_contrast`) — Side-by-side before/after — pain state vs winning state.
- **Founder Authority** (`founder_authority`) — Face + credibility + bold promise.
- **Product Hero** (`product_hero`) — Product or offer as the visual anchor.
- **UGC Native** (`ugc_native`) — Looks like an organic creator post — low polish, high trust.
- **Bold Offer** (`bold_offer`) — Direct response — the offer itself is the hook.
- **Social Proof** (`social_proof`) — Testimonials, numbers, screenshots, proof stack.
- **Problem / Symptom** (`problem_symptom`) — Dramatize the pain visually.
- **Transformation** (`transformation`) — Aspirational end state — who they become.
- **Comparison** (`comparison`) — Old way vs new way.
- **Curiosity Pattern Interrupt** (`curiosity_pattern`) — Weird/specific visual that stops scroll.

TSX templates under `examples/ads/templates/` are deprecated. Use `generate_image` + optional overlay TSX.'),
  ('vibey', 'ad-builder', NULL, 'references/brain-protocol.md', 'text/markdown', '# Brain Protocol (Pre-Flight)

Before any ad creative tool call:
1. get_narrative_pages
2. search_memory (gaps only)
3. search_campaign_knowledge (if campaign active)
4. search_company_cortex (org scope)
5. list_offers / get_offer / list_avatars / get_avatar / theme

Skip if already in injected context.'),
  ('vibey', 'ad-builder', NULL, 'references/image-edit-protocol.md', 'text/markdown', '# Image Edit Protocol

Use edit_image when modifying an existing asset (canvas parent or campaign library).
Use generate_image for net-new scenes.

Always pass parent_image_asset_id when available. In canvas mode pass canvas_node_id.'),
  ('vibey', 'ad-builder', NULL, 'references/canvas-operator.md', 'text/markdown', '# Canvas Operator

Envelope type: ad_creative_canvas_delegate.
Fields: node_id, canvas_id, ad_set_id, intent (generate|edit|variation), user_brief, strategy_key?, parent_image_asset_id?

Rules:
- Run brain protocol + list_canvas_nodes
- generate_image or edit_image with canvas_node_id
- Never create_ad in canvas mode
- Stream short status lines'),
  ('vibey', 'ad-builder', NULL, 'references/prompt-craft-playbook.md', 'text/markdown', '# Prompt Craft

- Ground prompts in brain data (avatar pain, offer language, theme colors)
- Anti-patterns: stock photo clichés, unreadable tiny text, generic adjectives
- Gemini Flash: fast iteration | GPT Image 2: legible text | Flux/Gemini Pro: fidelity')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;


INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/visual-contrast.md', 'text/markdown', '# Visual Contrast (`visual_contrast`)

## When to use
Transformation offers, coaching, business growth, fitness.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Dark cinematic ad creative, side-by-side split composition. Left: {{pain_state}}. Right: {{win_state}}. Same industry, same timeframe, different outcome. Moody lighting, high contrast, minimal on-image text. Brand accent: {{accent_color}}.
```

## Overlay guidance
Minimal text — let the visual contrast carry the message.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/founder-authority.md', 'text/markdown', '# Founder Authority (`founder_authority`)

## When to use
Personal brands, coaching, consulting, high-ticket.

## Required assets
- headshot

## Recommended format
single_image

## Prompt skeleton
```
Professional ad creative featuring a confident founder portrait. {{headline}}. Clean layout, brand colors {{primary_color}} and {{accent_color}}, authority positioning, premium feel.
```

## Overlay guidance
Headline + credential line.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/product-hero.md', 'text/markdown', '# Product Hero (`product_hero`)

## When to use
E-commerce, courses, SaaS, physical products.

## Required assets
- product_image

## Recommended format
single_image

## Prompt skeleton
```
Premium product hero ad. {{product_description}} centered prominently. Clean background using {{primary_color}}, soft studio lighting, aspirational but realistic.
```

## Overlay guidance
Product name + offer hook.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/ugc-native.md', 'text/markdown', '# UGC Native (`ugc_native`)

## When to use
Cold audiences, scroll-stopping, social proof angles.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
UGC-style native ad, phone camera aesthetic, authentic lighting, slightly imperfect framing, feels like a real person posting about {{offer}}. Not stock-photo clean.
```

## Overlay guidance
Casual headline, phone-screenshot aesthetic.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/bold-offer.md', 'text/markdown', '# Bold Offer (`bold_offer`)

## When to use
Retargeting, offer-aware audiences, webinars, free trainings.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Bold direct-response ad. Large typography for {{offer_headline}}. High-energy design, brand colors {{primary_color}} and {{accent_color}}, strong CTA placement bottom third.
```

## Overlay guidance
Large offer text + CTA.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/social-proof.md', 'text/markdown', '# Social Proof (`social_proof`)

## When to use
Warm audiences, credibility-building, results-focused offers.

## Required assets
- None

## Recommended format
carousel

## Prompt skeleton
```
Social proof ad creative. Show {{proof_element}} — testimonial screenshot, star rating, or result metric. Clean, trustworthy layout, brand colors {{primary_color}}.
```

## Overlay guidance
Stat or quote callout.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/problem-symptom.md', 'text/markdown', '# Problem / Symptom (`problem_symptom`)

## When to use
Problem-aware audiences, health, business frustration angles.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Problem-focused ad visual dramatizing {{pain_symptom}}. Dark moody atmosphere, relatable scenario specific to {{audience}}, viewer should feel "that is me". Minimal text.
```

## Overlay guidance
Symptom headline only.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/transformation.md', 'text/markdown', '# Transformation (`transformation`)

## When to use
Coaching, fitness, lifestyle, identity shifts.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Aspirational transformation ad showing {{desired_outcome}}. Golden hour lighting, emotional resonance, viewer wants to become this person. Brand accent {{accent_color}}.
```

## Overlay guidance
Transformation promise headline.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/comparison.md', 'text/markdown', '# Comparison (`comparison`)

## When to use
Category disruption, method differentiation, SaaS vs legacy.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Comparison ad creative. Left labeled "Old Way": {{old_way}}. Right labeled "New Way": {{new_way}}. Clean split layout, brand colors, clear visual hierarchy.
```

## Overlay guidance
Old way / new way labels.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, 'examples/strategies/curiosity-pattern.md', 'text/markdown', '# Curiosity Pattern Interrupt (`curiosity_pattern`)

## When to use
Cold audiences, pattern interrupt, curiosity hooks.

## Required assets
- None

## Recommended format
single_image

## Prompt skeleton
```
Pattern-interrupt ad visual. Unexpected specific detail about {{curiosity_hook}}. Stops the scroll, feels slightly weird or counterintuitive, dark cinematic mood.
```

## Overlay guidance
Curiosity hook only — one line.
')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

-- Designer / Lux / Ivy system skills (image-first alignment)
UPDATE agent_skills
SET markdown_content = '## Ad Creative System (Image-First)

You design ads using the Vibey image-first ad system. You create high-converting Meta ad creatives using the same image-first primitives as the Ad Creative Canvas. TSX templates are deprecated — generate images, then optional overlay TSX only when precision text is required.

## Phase 1 — Read Context (mandatory before any creation tool call)

1. `get_narrative_pages` — brand voice, positioning, past ad decisions, ICP language
2. `search_memory` — only for facts not in narrative pages
3. `search_campaign_knowledge` — when a campaign is active
4. `search_company_cortex` — when org scope applies (copy standards, anti-patterns)
5. `list_offers` + `get_offer`, `list_avatars` + `get_avatar`, trust ACTIVE_THEME or `list_themes`

Skip reads already present in injected brain context.

## Phase 2 — Choose Strategy

Use the 10-strategy library (same keys as canvas):

- **Visual Contrast** (`visual_contrast`) — Side-by-side before/after — pain state vs winning state.
- **Founder Authority** (`founder_authority`) — Face + credibility + bold promise.
- **Product Hero** (`product_hero`) — Product or offer as the visual anchor.
- **UGC Native** (`ugc_native`) — Looks like an organic creator post — low polish, high trust.
- **Bold Offer** (`bold_offer`) — Direct response — the offer itself is the hook.
- **Social Proof** (`social_proof`) — Testimonials, numbers, screenshots, proof stack.
- **Problem / Symptom** (`problem_symptom`) — Dramatize the pain visually.
- **Transformation** (`transformation`) — Aspirational end state — who they become.
- **Comparison** (`comparison`) — Old way vs new way.
- **Curiosity Pattern Interrupt** (`curiosity_pattern`) — Weird/specific visual that stops scroll.

Default for multi-ad: 2–3 strategies × 2–3 variations = 4–9 ads.

## Phase 3 — Generate Creative (image-first)

- New image: `generate_image` with composed prompt from strategy skeleton + brain specifics
- Edit / image-to-image: `edit_image` with `parent_image_asset_id`
- Carousel: multiple images + structured `carousel_cards`
- Video: `generate_video` with first-frame image
- Overlay: optional `generated_tsx` for precision headlines when the bitmap cannot carry text

## Phase 4 — Save and Explain

- `bulk_create_ads` or N × `create_ad` with `image_url`, copy, `metadata.creative_strategy`
- Brief the user: what was created, which strategy, which brain insight drove it

## Canvas Operator Mode

When the user message is a `ad_creative_canvas_delegate` envelope (`node_id`, `canvas_id`, `intent`, `user_brief`):

1. Still run Phase 1; also `list_canvas_nodes` for sibling coherence
2. If `strategy_key` is set, use it; else pick from library
3. `generate_image` (intent generate) or `edit_image` (intent edit) **with `canvas_node_id`** — do NOT `create_ad` in canvas mode
4. Emit short status lines: "Reading your brain", "Choosing strategy: X", "Crafting prompt", "Generating image", "Done"

Read `references/canvas-operator.md`, `references/brain-protocol.md`, `references/image-edit-protocol.md`, `references/prompt-craft-playbook.md`, and `examples/strategies/*.md`.',
    updated_at = now()
WHERE skill_key = 'ad-creative-design' AND agent_key = 'designer' AND user_id IS NULL;

UPDATE agent_skills
SET markdown_content = '## Premium Ad Image Generation

Image-first Lux workflow aligned with the Ad Creative Canvas.

## Phase 1 — Brain read (same as ad-builder brain-protocol.md)
## Phase 2 — Pick from 10 strategies (visual_contrast is one option, not the only one)
## Phase 3 — generate_image / edit_image with model gemini-3.1-flash-image-preview default
## Phase 4 — create_ad or canvas_node_id writeback

Read examples/strategies/*.md for prompt skeletons.',
    updated_at = now()
WHERE skill_key = 'premium-ad-image-generation' AND agent_key = 'lux' AND user_id IS NULL;

UPDATE agent_skills
SET markdown_content = '## Ad Copy Writing

## Phase 1 — Brain read (brain-protocol.md)
## Phase 2 — Choose copy angle from examples/ads/copy-angles.md
## Phase 3 — Write headline, primary_text, description
When an image_url exists on the brief, write copy that matches the visual.',
    updated_at = now()
WHERE skill_key = 'ad-copy-writing' AND agent_key = 'ivy' AND user_id IS NULL;

-- Designer template seed (Lux hire)
INSERT INTO agent_template_skills (template_key, skill_key, name, description, markdown_content, resources, is_enabled)
SELECT 'designer', skill_key, name, description, markdown_content, resources, true
FROM agent_skills
WHERE skill_key IN ('ad-creative-design', 'premium-ad-image-generation', 'ad-copy-writing')
  AND user_id IS NULL
  AND agent_key IN ('designer', 'lux', 'ivy')
ON CONFLICT (template_key, skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  resources = EXCLUDED.resources,
  is_enabled = EXCLUDED.is_enabled;
