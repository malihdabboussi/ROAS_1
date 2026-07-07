UPDATE agent_skills
SET
  description = 'Generate and save Meta-style ads with mandatory real-example grounding from the Ad Examples Library',
  markdown_content = $$## Ad Examples Library (MANDATORY)

Before generating any ad image or writing ad copy, you MUST use the real example library stored in the Vibey workspace:

- Read index first: `examples/ads/INDEX.md`
- Then read the most relevant pattern file(s) from `examples/ads/{category}/*.md`
- Visually inspect the reference images (use `read` on the image files) to see real executions
- Reuse proven layout patterns, copy formulas, and color relationships from those examples
- Adapt all colors to the user's active campaign theme — patterns describe relationships, not fixed values
- Do not skip this step, even when user prompts are short$$ || E'\n\n' || markdown_content,
  updated_at = NOW()
WHERE skill_key = 'ad-builder'
  AND markdown_content NOT ILIKE '%Ad Examples Library (MANDATORY)%';
