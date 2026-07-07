UPDATE agent_skills
SET
  description = 'Build high-converting landing pages and sales funnels with mandatory silent example grounding',
  markdown_content = $$## Funnel Examples Grounding v2 (MANDATORY - INTERNAL ONLY)

Before writing any funnel page TSX, you MUST ground your output in the real funnel library:

1. Read `examples/funnels/INDEX.md` first.
2. Select 2-3 examples that match funnel type + offer style + audience.
3. Read the selected full example files from `examples/funnels/{category}/*.md`.
4. Apply concrete patterns from those examples in final page structure.

Internal-only rule:
- Do NOT mention chosen example names/files unless the user explicitly asks.
- Keep user-facing responses focused on the final funnel.

Anti-generic rule:
- Generic template output is prohibited when relevant examples exist.
- Each funnel must reflect at least 3 concrete structural decisions from selected examples.
$$ || E'\n\n' || markdown_content,
  updated_at = NOW()
WHERE skill_key = 'funnel-builder'
  AND markdown_content NOT ILIKE '%Funnel Examples Grounding v2 (MANDATORY - INTERNAL ONLY)%';
