UPDATE agent_skills
SET
  description = 'Build high-converting landing pages and sales funnels with mandatory real-example grounding',
  markdown_content = $$## Funnel Examples Library (MANDATORY)

Before writing funnel page TSX, you MUST use the real example library stored in the Vibey workspace:

- Read index first: `examples/funnels/INDEX.md`
- Then read only the most relevant full examples from `examples/funnels/{category}/*.md`
- Reuse proven section structure, offer sequencing, and CTA patterns from those examples
- Do not skip this step, even when user prompts are short$$ || E'\n\n' || markdown_content,
  updated_at = NOW()
WHERE skill_key = 'funnel-builder'
  AND markdown_content NOT ILIKE '%Funnel Examples Library (MANDATORY)%';
