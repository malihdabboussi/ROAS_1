-- Premium funnel/site art direction, visual review, and builder handoff.
-- Replaces the overlapping funnel-page-design skill for non-user-managed copies.

BEGIN;

INSERT INTO public.skill_library (
  skill_key, name, description, markdown_content, category, updated_at
)
VALUES (
  'funnel-site-design',
  'Funnel and Site Design',
  $description$Creates high-fidelity art direction and conducts visual critique for funnels, landing pages, marketing websites, homepages, and major web redesigns. Use before a builder creates a new funnel or website, whenever the user asks for premium or non-template web design, and after implementation when desktop and mobile previews need review. Produces a Design Contract and critique; it does not replace funnel-builder, website-builder, copywriting, or wireframing.$description$,
  $skill$# Funnel and Site Design

Own the high-fidelity design decisions between structural wireframing and implementation. Builders own code and persistence. `roas-funnel-design` and `funnel-wireframe` own wireframes.

Read `references/design-contract.md` before creating art direction, `references/brand-register.md` for a new build or major redesign, and `references/visual-critique.md` when reviewing an implementation.

## Principles

Ground the direction in the real subject: its offer, audience, proof, product, founder, place, process, language, and assets. Choose one visual thesis and one signature element. Premium quality comes from coherent editing, not an effect count.

Use structure to communicate real relationships. Cards, labels, numbers, icons, dividers, and motion that do not clarify anything are decoration and should be removed.

Use only verified proof. Do not invent urgency, scarcity, testimonials, customer counts, awards, logos, or performance claims.

Design the 390px mobile composition deliberately: reading order, image crops, hierarchy, touch behavior, and reachable actions. Do not reduce mobile guidance to stacking desktop columns.

## Workflow

1. Establish the brief: surface, audience, single job, offer, verified proof, brand inputs, real assets, anti-references, and technical constraints.
2. Write one subject-specific visual thesis. If a direct competitor could reuse it unchanged, derive it again from the subject.
3. Choose one signature element, typography relationship, color strategy, composition, image strategy, and justified motion posture.
4. Produce the complete Design Contract from `references/design-contract.md` with separate 1440px and 390px compositions. Mark substantive choices as Confirmed, Proposed, or Missing; never make a fallback font, guessed token, draft copy line, or arbitrary ratio look approved.
5. After implementation, open the real preview in the browser and inspect screenshots at 1440px and 390px. Taking screenshots is not review; inspect both images.
6. Run the fresh-context critique in `references/visual-critique.md`. Prioritize a small set of material revisions and preserve coherent decisions that work.

Do not default to gradient text, floating blobs, glass cards, bento grids, oversized metric rows, icon tiles, badge-pill heroes, decorative grids, or fade-up animation. These patterns are valid only when the subject and brief justify them.

## Output

For art direction, return the complete Design Contract plus a one-sentence summary. Edit it so a builder can scan the contract in under five minutes; state the shared system once and spend detail on decisions that change implementation.

For critique, return a verdict, strongest quality, priority issues with exact revisions, and desktop/mobile acceptance checks.

## Examples

Weak: "Premium dark webinar funnel with glowing cards and animated statistics."

Better: "A field-notebook editorial system built around the consultant's real annotated operating framework; cropped diagrams become the signature evidence while verified proof appears as full-width editorial material rather than testimonial cards."

Weak: "Minimal architecture portfolio with a bento grid."

Better: "A quiet project index borrowing from drawing sets; project photography carries the experience, drawing-number logic appears only where it encodes real project data, and mobile becomes a deliberate vertical exhibition."

## Quality bar

- Swapping the brand name would break the direction.
- One memorable signature replaces a collection of effects.
- Claims and proof remain grounded.
- Desktop and mobile feel separately composed.
- The builder can implement without guessing.
- Critique is based on inspected previews, not source-code imagination.
$skill$,
  'design',
  now()
)
ON CONFLICT (skill_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  category = EXCLUDED.category,
  updated_at = now();

INSERT INTO public.skill_library_resources (skill_key, file_path, content, content_type)
VALUES
(
  'funnel-site-design',
  'references/design-contract.md',
  $design_contract$# Design Contract

## Context

Record the surface and page set, audience, single job, offer, verified proof, brand inputs, anti-references, assets, and technical constraints.

## Decision status and open decisions

Mark substantive choices as Confirmed, Proposed, or Missing. Confirmed choices come from supplied assets or approved brand material. Proposed choices need approval. Missing choices block publishing or require an honest neutral state. Do not make a fallback font, guessed token value, draft copy line, or arbitrary ratio look approved. Group unresolved items once instead of repeating them.

## Visual thesis

Write one sentence connecting the subject to the design language. Add an inverse test explaining why a direct competitor could not reuse it unchanged.

## Signature element

Name the one memorable element, why it belongs to the subject, and where it appears. It may be typographic, photographic, editorial, spatial, illustrative, or interactive; it does not need to be an effect.

## Visual system

Specify color roles, heading/body/utility typography, border/corner/shadow posture, spacing rhythm, imagery, icons, motion, and reduced-motion behavior. Preserve existing brand tokens when present. Use relational layout guidance by default; add exact sizes, ratios, or percentages only when they prevent a real implementation ambiguity.

## Page composition

For each page, specify the opening thesis, section sequence, rhythm changes, proof placement, actions, and transitions.

## Responsive composition

Describe 1440px desktop and 390px mobile separately. Name container and column behavior, image scale and crop, reading order, typography changes, touch-safe actions, and sticky behavior. "Stack the columns" is not a mobile composition.

## Content integrity

List supplied claims and proof. List missing evidence separately. Never convert a gap into a placeholder testimonial, logo, metric, urgency device, or scarcity claim.

## Builder acceptance criteria

Write 5-10 observable checks covering fidelity to the thesis, hierarchy, signature, mobile behavior, accessibility, and content integrity.

Keep the full contract concise enough for a builder to scan the contract in under five minutes. Define the shared system once; for multi-page sites, describe only what is distinctive about each page.

## Example

An operations workshop with real annotated process maps uses those maps as the hero evidence and signature. At 390px the clearest annotated region moves below the promise and crops deliberately. No fake countdown or decorative ambient effect is added.
$design_contract$,
  'text/markdown'
),
(
  'funnel-site-design',
  'references/brand-register.md',
  $brand_register$# Brand Register

Preserve recognizable identity first. Inspect existing colors, fonts, components, photography, illustration, copy, and spatial conventions before proposing change.

For a blank slate, derive the visual language from physical materials, working artifacts, audience culture, product behavior, real proof, company history, and recurring offer language.

Funnels narrow attention toward one conversion. Keep navigation limited, proof close to claims, and repeated actions useful rather than pressuring.

Websites support exploration and trust across pages. Information architecture, shared layout, and page-to-page continuity matter more than repeating a CTA in every section.

Premium is confidence and editing: clear type hierarchy, meaningful scale and rhythm, strong real imagery, disciplined color roles, precise alignment or intentional asymmetry, one memorable move, and quiet supporting sections. It is not synonymous with gradients, glow, glass, dark mode, animation, or rounded cards.

Preserve approved copy during design. Flag copy that blocks hierarchy, but do not silently rewrite the offer. Never manufacture a social-proof section when no proof exists.
$brand_register$,
  'text/markdown'
),
(
  'funnel-site-design',
  'references/visual-critique.md',
  $visual_critique$# Visual Critique

Use a fresh designer task after implementation so the review does not inherit the builder's attachment to its own decisions.

Open the real preview and inspect screenshots at 1440px desktop and 390px mobile. If the preview cannot be opened, say visual QA is blocked; do not claim screenshot-level confidence from HTML or TSX alone.

Review in this order:

1. Five-second clarity: offer, audience, and primary action.
2. Subject specificity: could a competitor reuse the direction by swapping copy and logo?
3. Composition: scale, rhythm, whitespace, alignment, section transitions, and repeated structures.
4. Typography and imagery: hierarchy, wrapping, contrast, crops, asset quality, and semantic value.
5. Conversion integrity: credible actions and no fabricated proof, urgency, or scarcity.
6. Mobile: reading order, overflow, touch targets, image crop, sticky elements, and signature survival.
7. Technical audit: focus, semantics, reduced motion, image sizing/alt text, form labels, validation, and obvious performance risks.

Return a verdict, the strongest quality to preserve, no more than five priority issues with exact revisions, and observable desktop/mobile acceptance checks.
$visual_critique$,
  'text/markdown'
)
ON CONFLICT (skill_key, file_path) DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type;

INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES ('designer', 'funnel-site-design', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

-- Any future hire whose template can build funnels or websites also needs the
-- design contract for fallback execution and for interpreting designer handoffs.
INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
SELECT DISTINCT assignment.template_key, 'funnel-site-design', true
FROM public.template_skill_assignments AS assignment
WHERE assignment.skill_key IN ('funnel-builder', 'website-builder')
  AND assignment.is_enabled = true
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

-- System agents: the designer performs power-model design passes; Vibey can read
-- the contract and use it as a fallback when no designer is available.
INSERT INTO public.agent_skills AS existing (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, NULL, target.agent_key, library.skill_key, library.name, library.description,
  library.markdown_content, true, 'system'
FROM (VALUES ('designer'), ('vibey')) AS target(agent_key)
CROSS JOIN public.skill_library AS library
WHERE library.skill_key = 'funnel-site-design'
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now()
WHERE existing.source IN ('template', 'system', 'default');

-- Existing organization agents that already build or design funnel/site work.
INSERT INTO public.agent_skills AS existing (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT NULL, target.org_id, target.agent_key, library.skill_key, library.name, library.description,
  library.markdown_content, true, 'template'
FROM (
  SELECT DISTINCT org_id, agent_key
  FROM public.agent_skills
  WHERE org_id IS NOT NULL
    AND skill_key IN ('funnel-page-design', 'funnel-builder', 'website-builder')
  UNION
  SELECT DISTINCT org_id, agent_key
  FROM public.agents_registry
  WHERE org_id IS NOT NULL
    AND user_id IS NULL
    AND (
      agent_key IN ('designer', 'lux')
      OR COALESCE(role, '') ILIKE '%designer%'
    )
) AS target
CROSS JOIN public.skill_library AS library
WHERE library.skill_key = 'funnel-site-design'
ON CONFLICT (org_id, agent_key, skill_key) WHERE org_id IS NOT NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  updated_at = now()
WHERE existing.source IN ('template', 'system', 'default');

-- Existing personal agents with the same capability surface.
INSERT INTO public.agent_skills AS existing (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT target.user_id, NULL, target.agent_key, library.skill_key, library.name, library.description,
  library.markdown_content, true, 'template'
FROM (
  SELECT DISTINCT user_id, agent_key
  FROM public.agent_skills
  WHERE user_id IS NOT NULL
    AND org_id IS NULL
    AND skill_key IN ('funnel-page-design', 'funnel-builder', 'website-builder')
  UNION
  SELECT DISTINCT user_id, agent_key
  FROM public.agents_registry
  WHERE user_id IS NOT NULL
    AND org_id IS NULL
    AND (
      agent_key IN ('designer', 'lux')
      OR COALESCE(role, '') ILIKE '%designer%'
    )
) AS target
CROSS JOIN public.skill_library AS library
WHERE library.skill_key = 'funnel-site-design'
ON CONFLICT (user_id, agent_key, skill_key) WHERE user_id IS NOT NULL AND org_id IS NULL DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  updated_at = now()
WHERE existing.source IN ('template', 'system', 'default');

-- Copy reference resources to every non-user-managed skill copy.
INSERT INTO public.agent_skill_resources (
  user_id, org_id, agent_key, skill_key, file_path, content, content_type, storage_url
)
SELECT skill.user_id, skill.org_id, skill.agent_key, resource.skill_key, resource.file_path,
  resource.content, resource.content_type, NULL
FROM public.agent_skills AS skill
JOIN public.skill_library_resources AS resource ON resource.skill_key = skill.skill_key
WHERE skill.skill_key = 'funnel-site-design'
  AND skill.source IN ('template', 'system', 'default')
ON CONFLICT DO NOTHING;

UPDATE public.agent_skill_resources AS target
SET content = source.content, content_type = source.content_type, updated_at = now()
FROM public.skill_library_resources AS source
JOIN public.agent_skills AS owned ON owned.skill_key = source.skill_key
WHERE target.skill_key = source.skill_key
  AND target.file_path = source.file_path
  AND target.agent_key = owned.agent_key
  AND target.user_id IS NOT DISTINCT FROM owned.user_id
  AND target.org_id IS NOT DISTINCT FROM owned.org_id
  AND owned.skill_key = 'funnel-site-design'
  AND owned.source IN ('template', 'system', 'default');

-- Builder orchestration: design contract -> implementation -> fresh screenshot critique -> revision.
UPDATE public.agent_skills
SET markdown_content = $workflow$## Premium design workflow

For a new funnel/site or substantial visual redesign, read `skills/funnel-site-design/SKILL.md` before implementation.

1. Delegate art direction to the designer with the real brief, copy, proof, brand inputs, assets, anti-references, and builder constraints. Ask for the Design Contract. If no designer is available, produce the same contract yourself from the skill before writing code.
2. Implement the approved Design Contract. The contract outranks generic examples and component-library defaults.
3. After the artifact has a real preview, start a fresh designer review. Provide the artifact id and real preview location; ask the designer to inspect browser screenshots at 1440px and 390px and return the fresh-context critique. Never invent a preview URL.
4. Revise the implementation after critique. Re-check the desktop and mobile acceptance criteria before presenting the result.

No effect count is a quality requirement. Use gradients, glow, glass, animation, card grids, counters, and urgency mechanics only when the subject and verified content justify them. Do not invent urgency, scarcity, testimonials, or statistics.

$workflow$ || markdown_content,
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder')
  AND source IN ('template', 'system', 'default')
  AND markdown_content NOT LIKE '%## Premium design workflow%';

UPDATE public.skill_library
SET markdown_content = $workflow$## Premium design workflow

For a new funnel/site or substantial visual redesign, read `skills/funnel-site-design/SKILL.md` before implementation.

1. Delegate art direction to the designer with the real brief, copy, proof, brand inputs, assets, anti-references, and builder constraints. Ask for the Design Contract. If no designer is available, produce the same contract yourself from the skill before writing code.
2. Implement the Design Contract. It outranks generic examples and component-library defaults.
3. After the artifact has a real preview, start a fresh designer review. Ask for inspected browser screenshots at 1440px and 390px and the fresh-context critique. Never invent a preview URL.
4. Revise the implementation after critique and re-check desktop/mobile acceptance criteria.

No effect count is a quality requirement. Do not invent urgency, scarcity, testimonials, or statistics.

$workflow$ || markdown_content,
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder')
  AND markdown_content NOT LIKE '%## Premium design workflow%';

-- Remove the known contradictory mandates from all builder copies and the library.
UPDATE public.agent_skills
SET markdown_content = replace(
  replace(
    replace(
      replace(
        replace(markdown_content,
          'Incorporate at least 2 premium patterns per page: 1 background/ambient effect and 1 interaction/motion effect (CSS animations and transitions; small vanilla-JS IntersectionObserver reveals in `page.js` when needed).',
          'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
        'Apply at least 2 effects per page: 1 background/ambient + 1 interaction/motion.',
        'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
      'Use at least 2 per page: 1 ambient + 1 motion.',
      'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
    '- At least 1 conversion mechanic beyond the form (countdown, social proof, urgency)',
    '- Conversion mechanics appear only when supported by verified offer data and the Design Contract'),
  '- Hero feels premium: min 80vh, large type, ambient effect',
  '- The hero expresses the subject-specific visual thesis and works at desktop and mobile'),
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder')
  AND source IN ('template', 'system', 'default');

UPDATE public.skill_library
SET markdown_content = replace(
  replace(
    replace(
      replace(
        replace(markdown_content,
          'Incorporate at least 2 premium patterns per page: 1 background/ambient effect and 1 interaction/motion effect (CSS animations and transitions; small vanilla-JS IntersectionObserver reveals in `page.js` when needed).',
          'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
        'Apply at least 2 effects per page: 1 background/ambient + 1 interaction/motion.',
        'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
      'Use at least 2 per page: 1 ambient + 1 motion.',
      'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
    '- At least 1 conversion mechanic beyond the form (countdown, social proof, urgency)',
    '- Conversion mechanics appear only when supported by verified offer data and the Design Contract'),
  '- Hero feels premium: min 80vh, large type, ambient effect',
  '- The hero expresses the subject-specific visual thesis and works at desktop and mobile'),
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder');

UPDATE public.agent_skills
SET markdown_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(markdown_content,
            'Incorporate at least 2 premium patterns: 1 background/ambient effect and 1 interaction/motion effect.',
            'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
          '- Layered gradients and ambient glow effects (not flat solid-color sections)',
          '- Visual depth follows the subject-specific Design Contract; flat composition is valid'),
        '- At least 1 conversion mechanic beyond a basic form (countdown, social proof, urgency)',
        '- Conversion mechanics appear only when supported by verified offer data and the Design Contract'),
      '- A hero section that feels premium (min 80vh, large typography, ambient effects)',
      '- A hero that expresses the subject-specific visual thesis at desktop and mobile'),
    '- [ ] At least 2 visual effects (1 ambient + 1 motion)',
    '- [ ] Effects, if any, are justified by the Design Contract'),
  '- [ ] Home hero is premium (min 80vh, large typography, visual depth)',
  '- [ ] Home hero expresses the subject-specific visual thesis at desktop and mobile'),
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder')
  AND source IN ('template', 'system', 'default');

UPDATE public.skill_library
SET markdown_content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(markdown_content,
            'Incorporate at least 2 premium patterns: 1 background/ambient effect and 1 interaction/motion effect.',
            'Use effects only when they express the Design Contract; stillness is a valid and often stronger choice.'),
          '- Layered gradients and ambient glow effects (not flat solid-color sections)',
          '- Visual depth follows the subject-specific Design Contract; flat composition is valid'),
        '- At least 1 conversion mechanic beyond a basic form (countdown, social proof, urgency)',
        '- Conversion mechanics appear only when supported by verified offer data and the Design Contract'),
      '- A hero section that feels premium (min 80vh, large typography, ambient effects)',
      '- A hero that expresses the subject-specific visual thesis at desktop and mobile'),
    '- [ ] At least 2 visual effects (1 ambient + 1 motion)',
    '- [ ] Effects, if any, are justified by the Design Contract'),
  '- [ ] Home hero is premium (min 80vh, large typography, visual depth)',
  '- [ ] Home hero expresses the subject-specific visual thesis at desktop and mobile'),
  updated_at = now()
WHERE skill_key IN ('funnel-builder', 'website-builder');

-- Keep runtime skill catalogs aligned and route the specialist design lane to Opus 4.8.
UPDATE public.agents_registry AS registry
SET skills = (
  SELECT COALESCE(jsonb_agg(to_jsonb(skill_key) ORDER BY skill_key), '[]'::jsonb)
  FROM (
    SELECT DISTINCT existing.value AS skill_key
    FROM jsonb_array_elements_text(COALESCE(registry.skills, '[]'::jsonb)) AS existing(value)
    WHERE existing.value <> 'funnel-page-design'
    UNION
    SELECT 'funnel-site-design'
  ) AS catalog
),
config = jsonb_set(COALESCE(registry.config, '{}'::jsonb), '{model_id}', '"anthropic/claude-opus-4.8"', true),
updated_at = now()
WHERE EXISTS (
  SELECT 1
  FROM public.agent_skills AS skill
  WHERE skill.skill_key = 'funnel-site-design'
    AND skill.agent_key = registry.agent_key
    AND skill.user_id IS NOT DISTINCT FROM registry.user_id
    AND skill.org_id IS NOT DISTINCT FROM registry.org_id
)
AND (
  registry.agent_key IN ('designer', 'lux')
  OR COALESCE(registry.role, '') ILIKE '%designer%'
);

-- Retire only platform-managed legacy copies; user-authored variants remain untouched.
DELETE FROM public.template_skill_assignments
WHERE skill_key = 'funnel-page-design';

DELETE FROM public.agent_skill_resources AS resource
USING public.agent_skills AS skill
WHERE resource.agent_key = skill.agent_key
  AND resource.skill_key = skill.skill_key
  AND resource.user_id IS NOT DISTINCT FROM skill.user_id
  AND resource.org_id IS NOT DISTINCT FROM skill.org_id
  AND skill.skill_key = 'funnel-page-design'
  AND skill.source IN ('template', 'system', 'default');

DELETE FROM public.agent_skills
WHERE skill_key = 'funnel-page-design'
  AND source IN ('template', 'system', 'default');

COMMIT;
