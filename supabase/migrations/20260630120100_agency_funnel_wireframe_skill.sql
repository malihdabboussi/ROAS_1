-- Stub funnel-wireframe skill for agency funnel build preset (wireframe step).
-- Replace markdown_content when the agency wireframe skill is finalized.

INSERT INTO public.agent_skills (
  user_id,
  org_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled,
  source
)
SELECT
  NULL,
  NULL,
  'vibey',
  'funnel-wireframe',
  'Funnel Wireframe',
  'Structures funnel pages into sections, hierarchy, and layout notes before HTML design.',
  $skill$# Funnel Wireframe

Use this skill when a flow or user asks for a funnel wireframe — section order, hierarchy, and layout notes only. Do not produce final HTML.

## When to use

- Agency funnel build pipeline (wireframe step after copy)
- User asks for structure, outline, or wireframe before design

## Process

1. Read the client brief and approved copy from context.
2. Define page sections top-to-bottom (hero, problem, solution, proof, offer, FAQ, CTA, footer as needed).
3. For each section: purpose, headline angle, key bullets, visual note (image/video/form placement).
4. Note mobile vs desktop layout priorities.
5. Output as a structured markdown wireframe — no HTML/CSS.

## Output format

```markdown
# Funnel wireframe: [title]

## Section 1: Hero
- Headline: ...
- Subhead: ...
- CTA: ...
- Visual: ...

## Section 2: ...
```

Keep it concise and ready for funnel-builder to implement.
$skill$,
  true,
  'system'
WHERE NOT EXISTS (
  SELECT 1
    FROM public.agent_skills
   WHERE user_id IS NULL
     AND org_id IS NULL
     AND agent_key = 'vibey'
     AND skill_key = 'funnel-wireframe'
);

UPDATE public.agents_registry
   SET skills = (
     SELECT COALESCE(jsonb_agg(DISTINCT to_jsonb(elem)), '[]'::jsonb)
       FROM (
         SELECT jsonb_array_elements_text(COALESCE(skills, '[]'::jsonb)) AS elem
         UNION ALL
         SELECT 'funnel-wireframe'
       ) s
   ),
   updated_at = now()
 WHERE user_id IS NULL
   AND org_id IS NULL
   AND agent_key = 'vibey'
   AND NOT COALESCE(skills, '[]'::jsonb) ? 'funnel-wireframe';
