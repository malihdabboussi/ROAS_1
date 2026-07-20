BEGIN;

-- Future copywriters inherit the voice rule in their always-loaded TOOLS definition.
UPDATE public.agent_templates
SET
  content = content || $rule$

## Mandatory Writing Standard

Before drafting or revising any client-facing copy, load `skills/dylans-super-voice/SKILL.md` and use it as the only voice authority. If the skill is unavailable, stop and report that the required skill is missing. Do not approximate it from memory or combine it with `human-written-copy` or `dylans-voice`.

Keep Dylan Super Voice active through the final review. Run its complete checklist before saving, then search every shipping line for the literal `—` character. Client-facing copy with an em dash must be rejected and rewritten before handoff.
$rule$,
  updated_at = now()
WHERE template_key = 'copywriter'
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Mandatory Writing Standard%';

-- Existing copywriters get the same always-loaded instruction without replacing
-- custom tool guidance already present in their definition.
UPDATE public.agent_definitions AS definition
SET
  content = definition.content || $rule$

## Mandatory Writing Standard

Before drafting or revising any client-facing copy, load `skills/dylans-super-voice/SKILL.md` and use it as the only voice authority. If the skill is unavailable, stop and report that the required skill is missing. Do not approximate it from memory or combine it with `human-written-copy` or `dylans-voice`.

Keep Dylan Super Voice active through the final review. Run its complete checklist before saving, then search every shipping line for the literal `—` character. Client-facing copy with an em dash must be rejected and rewritten before handoff.
$rule$,
  updated_at = now()
FROM public.agents_registry AS registry
WHERE definition.file_name = 'TOOLS.md'
  AND definition.agent_key = registry.agent_key
  AND definition.user_id IS NOT DISTINCT FROM registry.user_id
  AND definition.org_id IS NOT DISTINCT FROM registry.org_id
  AND definition.content NOT LIKE '%## Mandatory Writing Standard%'
  AND (
    registry.agent_key IN ('copywriter', 'ivy', 'wren')
    OR COALESCE(registry.role, '') ILIKE '%copywriter%'
    OR EXISTS (
      SELECT 1
      FROM public.agent_skills AS marker
      WHERE marker.agent_key = registry.agent_key
        AND marker.user_id IS NOT DISTINCT FROM registry.user_id
        AND marker.org_id IS NOT DISTINCT FROM registry.org_id
        AND marker.skill_key = 'roas-webinar-copy-package'
    )
  );

-- Canonical library copywriter definitions are fallback prompt sources.
UPDATE public.agent_definitions
SET
  content = content || $rule$

## Mandatory Writing Standard

Before drafting or revising any client-facing copy, load `skills/dylans-super-voice/SKILL.md` and use it as the only voice authority. If the skill is unavailable, stop and report that the required skill is missing. Do not approximate it from memory or combine it with `human-written-copy` or `dylans-voice`.

Keep Dylan Super Voice active through the final review. Run its complete checklist before saving, then search every shipping line for the literal `—` character. Client-facing copy with an em dash must be rejected and rewritten before handoff.
$rule$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('copywriter', 'ivy', 'wren')
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Mandatory Writing Standard%';

-- Future and existing copywriters must have the canonical voice skill enabled.
INSERT INTO public.template_skill_assignments (template_key, skill_key, is_enabled)
VALUES ('copywriter', 'dylans-super-voice', true)
ON CONFLICT (template_key, skill_key) DO UPDATE SET is_enabled = true;

INSERT INTO public.agent_skills AS existing (
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
  registry.user_id,
  registry.org_id,
  registry.agent_key,
  voice.skill_key,
  voice.name,
  voice.description,
  voice.markdown_content,
  true,
  CASE
    WHEN registry.user_id IS NULL AND registry.org_id IS NULL THEN 'system'
    ELSE 'default'
  END
FROM public.agents_registry AS registry
CROSS JOIN public.skill_library AS voice
WHERE voice.skill_key = 'dylans-super-voice'
  AND (
    registry.agent_key IN ('copywriter', 'ivy', 'wren')
    OR COALESCE(registry.role, '') ILIKE '%copywriter%'
    OR EXISTS (
      SELECT 1
      FROM public.agent_skills AS marker
      WHERE marker.agent_key = registry.agent_key
        AND marker.user_id IS NOT DISTINCT FROM registry.user_id
        AND marker.org_id IS NOT DISTINCT FROM registry.org_id
        AND marker.skill_key = 'roas-webinar-copy-package'
    )
  )
ON CONFLICT DO NOTHING;

UPDATE public.agent_skills
SET is_enabled = true, updated_at = now()
WHERE skill_key = 'dylans-super-voice'
  AND EXISTS (
    SELECT 1
    FROM public.agents_registry AS registry
    WHERE registry.agent_key = agent_skills.agent_key
      AND registry.user_id IS NOT DISTINCT FROM agent_skills.user_id
      AND registry.org_id IS NOT DISTINCT FROM agent_skills.org_id
      AND (
        registry.agent_key IN ('copywriter', 'ivy', 'wren')
        OR COALESCE(registry.role, '') ILIKE '%copywriter%'
        OR EXISTS (
          SELECT 1
          FROM public.agent_skills AS marker
          WHERE marker.agent_key = registry.agent_key
            AND marker.user_id IS NOT DISTINCT FROM registry.user_id
            AND marker.org_id IS NOT DISTINCT FROM registry.org_id
            AND marker.skill_key = 'roas-webinar-copy-package'
        )
      )
  );

-- Copywriting is a quality-sensitive specialist lane, so both existing and
-- future copywriter agents use Opus 4.8 instead of mission-worker `auto`.
UPDATE public.agents_registry AS registry
SET
  config = jsonb_set(
    COALESCE(registry.config, '{}'::jsonb),
    '{model_id}',
    '"anthropic/claude-opus-4.8"'::jsonb,
    true
  ),
  updated_at = now()
WHERE registry.agent_key IN ('copywriter', 'ivy', 'wren')
  OR COALESCE(registry.role, '') ILIKE '%copywriter%'
  OR EXISTS (
    SELECT 1
    FROM public.agent_skills AS marker
    WHERE marker.agent_key = registry.agent_key
      AND marker.user_id IS NOT DISTINCT FROM registry.user_id
      AND marker.org_id IS NOT DISTINCT FROM registry.org_id
      AND marker.skill_key = 'roas-webinar-copy-package'
  );

COMMIT;
