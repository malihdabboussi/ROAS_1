#!/usr/bin/env node
/**
 * Generates supabase/migrations/*_ad_creative_skills_rewrite.sql from packages/api-shared ad strategies.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { AD_STRATEGIES } from '../packages/api-shared/dist/ad-strategies.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ts = '20260520150000'
const outPath = join(root, 'supabase/migrations', `${ts}_ad_creative_skills_rewrite.sql`)

const strategyList = AD_STRATEGIES.map(
  (s) => `- **${s.name}** (\`${s.key}\`) — ${s.description}`,
).join('\n')

const adBuilderBody = `## Ad Creative System (Image-First)

You create high-converting Meta ad creatives using the same image-first primitives as the Ad Creative Canvas. TSX templates are deprecated — generate images, then optional overlay TSX only when precision text is required.

## Phase 1 — Read Context (mandatory before any creation tool call)

1. \`get_narrative_pages\` — brand voice, positioning, past ad decisions, ICP language
2. \`search_memory\` — only for facts not in narrative pages
3. \`search_campaign_knowledge\` — when a campaign is active
4. \`search_company_cortex\` — when org scope applies (copy standards, anti-patterns)
5. \`list_offers\` + \`get_offer\`, \`list_avatars\` + \`get_avatar\`, trust ACTIVE_THEME or \`list_themes\`

Skip reads already present in injected brain context.

## Phase 2 — Choose Strategy

Use the 10-strategy library (same keys as canvas):

${strategyList}

Default for multi-ad: 2–3 strategies × 2–3 variations = 4–9 ads.

## Phase 3 — Generate Creative (image-first)

- New image: \`generate_image\` with composed prompt from strategy skeleton + brain specifics
- Edit / image-to-image: \`edit_image\` with \`parent_image_asset_id\`
- Carousel: multiple images + structured \`carousel_cards\`
- Video: \`generate_video\` with first-frame image
- Overlay: optional \`generated_tsx\` for precision headlines when the bitmap cannot carry text

## Phase 4 — Save and Explain

- \`bulk_create_ads\` or N × \`create_ad\` with \`image_url\`, copy, \`metadata.creative_strategy\`
- Brief the user: what was created, which strategy, which brain insight drove it

## Canvas Operator Mode

When the user message is a \`ad_creative_canvas_delegate\` envelope (\`node_id\`, \`canvas_id\`, \`intent\`, \`user_brief\`):

1. Still run Phase 1; also \`list_canvas_nodes\` for sibling coherence
2. If \`strategy_key\` is set, use it; else pick from library
3. \`generate_image\` (intent generate) or \`edit_image\` (intent edit) **with \`canvas_node_id\`** — do NOT \`create_ad\` in canvas mode
4. Emit short status lines: "Reading your brain", "Choosing strategy: X", "Crafting prompt", "Generating image", "Done"

Read \`references/canvas-operator.md\`, \`references/brain-protocol.md\`, \`references/image-edit-protocol.md\`, \`references/prompt-craft-playbook.md\`, and \`examples/strategies/*.md\`.` 

function sqlEscape(s) {
  return s.replace(/'/g, "''")
}

const strategyInserts = AD_STRATEGIES.map((s) => {
  const path = `examples/strategies/${s.key.replace(/_/g, '-')}.md`
  const content = `# ${s.name} (\`${s.key}\`)

## When to use
${s.whenToUse}

## Required assets
${s.requiredAssets.length ? s.requiredAssets.map((a) => `- ${a}`).join('\n') : '- None'}

## Recommended format
${s.recommendedFormat}

## Prompt skeleton
\`\`\`
${s.defaultPromptTemplate}
\`\`\`

## Overlay guidance
${s.suggestedOverlay}
`
  return `
INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES ('vibey', 'ad-builder', NULL, '${path}', 'text/markdown', '${sqlEscape(content)}')
ON CONFLICT (agent_key, skill_key, file_path) WHERE user_id IS NULL AND org_id IS NULL DO UPDATE SET markdown_content = EXCLUDED.markdown_content;`
}).join('\n')

const sql = `-- Ad Creative skills rewrite — image-first + 10-strategy library (Phase 2)

UPDATE agent_skills
SET markdown_content = '${sqlEscape(adBuilderBody)}',
    updated_at = now()
WHERE skill_key = 'ad-builder' AND agent_key = 'vibey' AND user_id IS NULL;

DELETE FROM agent_skill_resources
WHERE skill_key = 'ad-builder'
  AND agent_key = 'vibey'
  AND user_id IS NULL
  AND file_path LIKE 'examples/ads/templates/%';

INSERT INTO agent_skill_resources (agent_key, skill_key, user_id, file_path, content_type, markdown_content)
VALUES
  ('vibey', 'ad-builder', NULL, 'examples/ads/INDEX.md', 'text/markdown', '${sqlEscape(`# Ad Strategy Index

Use the 10 image-first strategies in \`examples/strategies/\`:

${strategyList}

TSX templates under \`examples/ads/templates/\` are deprecated. Use \`generate_image\` + optional overlay TSX.`)}'),
  ('vibey', 'ad-builder', NULL, 'references/brain-protocol.md', 'text/markdown', '${sqlEscape(`# Brain Protocol (Pre-Flight)

Before any ad creative tool call:
1. get_narrative_pages
2. search_memory (gaps only)
3. search_campaign_knowledge (if campaign active)
4. search_company_cortex (org scope)
5. list_offers / get_offer / list_avatars / get_avatar / theme

Skip if already in injected context.`)}'),
  ('vibey', 'ad-builder', NULL, 'references/image-edit-protocol.md', 'text/markdown', '${sqlEscape(`# Image Edit Protocol

Use edit_image when modifying an existing asset (canvas parent or campaign library).
Use generate_image for net-new scenes.

Always pass parent_image_asset_id when available. In canvas mode pass canvas_node_id.`)}'),
  ('vibey', 'ad-builder', NULL, 'references/canvas-operator.md', 'text/markdown', '${sqlEscape(`# Canvas Operator

Envelope type: ad_creative_canvas_delegate.
Fields: node_id, canvas_id, ad_set_id, intent (generate|edit|variation), user_brief, strategy_key?, parent_image_asset_id?

Rules:
- Run brain protocol + list_canvas_nodes
- generate_image or edit_image with canvas_node_id
- Never create_ad in canvas mode
- Stream short status lines`)}'),
  ('vibey', 'ad-builder', NULL, 'references/prompt-craft-playbook.md', 'text/markdown', '${sqlEscape(`# Prompt Craft

- Ground prompts in brain data (avatar pain, offer language, theme colors)
- Anti-patterns: stock photo clichés, unreadable tiny text, generic adjectives
- Gemini Flash: fast iteration | GPT Image 2: legible text | Flux/Gemini Pro: fidelity`)}')
ON CONFLICT (agent_key, skill_key, user_id, file_path) DO UPDATE SET markdown_content = EXCLUDED.markdown_content;

${strategyInserts}

-- Designer / Lux / Ivy system skills (image-first alignment)
UPDATE agent_skills
SET markdown_content = '${sqlEscape(adBuilderBody.replace('vibey_backend', 'vibey_backend').replace('You create', 'You design ads using the Vibey image-first ad system. You create'))}',
    updated_at = now()
WHERE skill_key = 'ad-creative-design' AND agent_key = 'designer' AND user_id IS NULL;

UPDATE agent_skills
SET markdown_content = '${sqlEscape(`## Premium Ad Image Generation

Image-first Lux workflow aligned with the Ad Creative Canvas.

## Phase 1 — Brain read (same as ad-builder brain-protocol.md)
## Phase 2 — Pick from 10 strategies (visual_contrast is one option, not the only one)
## Phase 3 — generate_image / edit_image with model gemini-3.1-flash-image-preview default
## Phase 4 — create_ad or canvas_node_id writeback

Read examples/strategies/*.md for prompt skeletons.`)}',
    updated_at = now()
WHERE skill_key = 'premium-ad-image-generation' AND agent_key = 'lux' AND user_id IS NULL;

UPDATE agent_skills
SET markdown_content = '${sqlEscape(`## Ad Copy Writing

## Phase 1 — Brain read (brain-protocol.md)
## Phase 2 — Choose copy angle from examples/ads/copy-angles.md
## Phase 3 — Write headline, primary_text, description
When an image_url exists on the brief, write copy that matches the visual.`)}',
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
`

writeFileSync(outPath, sql)
console.log('Wrote', outPath)
