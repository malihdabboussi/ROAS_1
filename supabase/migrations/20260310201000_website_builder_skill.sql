-- Seed website-builder skill for all existing users on vibey agent.
-- Skills are DB-first and are synced to runtime SKILL.md files by agent sync.

INSERT INTO agent_skills (
  user_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled
)
SELECT
  u.id,
  'vibey',
  'website-builder',
  'Website Builder',
  'Build multi-page websites with shared navigation, footer, and interconnected pages. Use when the user wants a full website (not a single landing page or funnel).',
  $$# Website Builder Skill

> Use this skill when the user wants a full website with multiple connected pages and shared layout.
> For single-page funnels, use funnel-builder.

## Pre-Build Gates (MANDATORY)

### Gate 1 — Theme
- Call `list_themes`
- If no theme exists, run the theme flow first
- Never generate pages without a selected theme

### Gate 2 — Media
- Ask for logo/hero/team/product assets
- Generate missing assets via `generate_image`
- Gather URLs before page generation

### Gate 3 — Visual Effects
- Read `../../data/visual-effects.md`
- Apply at least 2 effects: 1 ambient and 1 motion
- Keep effects cohesive across pages

## Build Flow

1. Create site container with `create_funnel` using `funnel_type: "website"`
2. Define minimum page map: Home, About, Services, Contact
3. Set shared layout with `set_website_layout`
4. Generate each page with `add_funnel_page` and explicit `path`
5. Verify nav paths exactly match created pages

## Rules

- Always create Home first (`page_type: "home"`, `path: "/"`)
- Set layout after funnel creation and before page creation
- Do not inline full header/footer inside each page TSX
- Contact page must include `data-vibey-capture` lead form
- Keep typography, color, and spacing consistent site-wide
$$,
  true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM agent_skills s
  WHERE s.user_id = u.id
    AND s.agent_key = 'vibey'
    AND s.skill_key = 'website-builder'
);
