BEGIN;

UPDATE public.agent_skills AS target
SET
  markdown_content = replace(
    replace(
      target.markdown_content,
      $old$Never invent what's missing. Anything undecided goes to OPEN, not to a guess.

---$old$,
      $new$Never invent what's missing. Anything undecided goes to OPEN, not to a guess.

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before drafting any client-facing wording. It is the only voice authority for the client strategy message, client recap, approval request, or update produced from this work. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts and vocabulary, but they do not override Dylan Super Voice.

Use Professional Message mode for the client Slack message. Before routing it for approval, run the complete Dylan Super Voice checklist and search the full message for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---$new$
    ),
    $old$- **Client message passes the human-copy standard.** No em dashes, no rhythmic triplets, specific numbers everywhere, reads like a person. Plain text, Slack-ready.$old$,
    $new$- **Client message passes Dylan Super Voice.** The skill must be loaded, it is the exclusive voice authority, and the complete message must pass its checklist plus the literal em-dash scan. Plain text, Slack-ready.$new$
  ),
  updated_at = now()
FROM public.skill_library AS library
WHERE target.skill_key = 'auto-skill-2-roas-strategy-adjust'
  AND library.skill_key = target.skill_key
  AND target.markdown_content = library.markdown_content;

UPDATE public.skill_library
SET
  markdown_content = replace(
    replace(
      markdown_content,
      $old$Never invent what's missing. Anything undecided goes to OPEN, not to a guess.

---$old$,
      $new$Never invent what's missing. Anything undecided goes to OPEN, not to a guess.

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before drafting any client-facing wording. It is the only voice authority for the client strategy message, client recap, approval request, or update produced from this work. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts and vocabulary, but they do not override Dylan Super Voice.

Use Professional Message mode for the client Slack message. Before routing it for approval, run the complete Dylan Super Voice checklist and search the full message for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---$new$
    ),
    $old$- **Client message passes the human-copy standard.** No em dashes, no rhythmic triplets, specific numbers everywhere, reads like a person. Plain text, Slack-ready.$old$,
    $new$- **Client message passes Dylan Super Voice.** The skill must be loaded, it is the exclusive voice authority, and the complete message must pass its checklist plus the literal em-dash scan. Plain text, Slack-ready.$new$
  ),
  updated_at = now()
WHERE skill_key = 'auto-skill-2-roas-strategy-adjust';

UPDATE public.agent_skill_resources AS target
SET
  content = replace(
    replace(
      target.content,
      $old$Rules for the message:
- Real links, real numbers, no promised results (targets are fine).$old$,
      $new$Rules for the message:
- Load `dylans-super-voice` before drafting. Use Professional Message mode as the only voice authority; do not combine it with `human-written-copy` or `dylans-voice`.
- Real links, real numbers, no promised results (targets are fine).$new$
    ),
    $old$- No em dashes. No triplets. Fifth-grade reading level. Sounds like a sharp teammate, not a report.$old$,
    $new$- No em dashes. No triplets. Fifth-grade reading level. Sounds like a sharp teammate, not a report.
- Run the complete Dylan Super Voice checklist and a literal `—` scan before the message enters approval.$new$
  ),
  updated_at = now()
FROM public.skill_library_resources AS library
WHERE target.skill_key = 'auto-skill-2-roas-strategy-adjust'
  AND target.file_path = 'references/output-template.md'
  AND library.skill_key = target.skill_key
  AND library.file_path = target.file_path
  AND target.content = library.content;

UPDATE public.skill_library_resources
SET
  content = replace(
    replace(
      content,
      $old$Rules for the message:
- Real links, real numbers, no promised results (targets are fine).$old$,
      $new$Rules for the message:
- Load `dylans-super-voice` before drafting. Use Professional Message mode as the only voice authority; do not combine it with `human-written-copy` or `dylans-voice`.
- Real links, real numbers, no promised results (targets are fine).$new$
    ),
    $old$- No em dashes. No triplets. Fifth-grade reading level. Sounds like a sharp teammate, not a report.$old$,
    $new$- No em dashes. No triplets. Fifth-grade reading level. Sounds like a sharp teammate, not a report.
- Run the complete Dylan Super Voice checklist and a literal `—` scan before the message enters approval.$new$
  )
WHERE skill_key = 'auto-skill-2-roas-strategy-adjust'
  AND file_path = 'references/output-template.md';

UPDATE public.agent_skills AS target
SET
  markdown_content = replace(
    replace(
      target.markdown_content,
      $old$**What this is:** the consolidation + recommendation step. Skills 1 and 2 produce hypothesis and truth; this merges them, adds the creative layer, and hands the strategist ONE thing to approve.
**What this is not:** production. No finished ad sets, no page copy, no email sequences, no task tree — those come after approval (auto-skill-4 and the production skills).

---$old$,
      $new$**What this is:** the consolidation + recommendation step. Skills 1 and 2 produce hypothesis and truth; this merges them, adds the creative layer, and hands the strategist ONE thing to approve.
**What this is not:** production. No finished ad sets, no page copy, no email sequences, no task tree — those come after approval (auto-skill-4 and the production skills).

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before writing THE PLAN, starter copy, client approval message, client update, or recap. It is the only voice authority. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts, vocabulary, and subject-matter texture, but they do not replace or override Dylan Super Voice.

Use the surface mode that matches the output: Long-Form Copy for marketing copy, Professional Message for client messages, and Operator Voice for internal team updates. Before saving, run the complete Dylan Super Voice checklist and search every shipping line for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---$new$
    ),
    $old$- **All narrative prose runs through the dylans-super-voice / human-copy standard.** If it reads like a database export or an AI summary, rewrite it.$old$,
    $new$- **All narrative prose runs through Dylan Super Voice exclusively.** Keep `dylans-super-voice` loaded, do not combine it with either legacy voice skill, and rewrite anything that reads like a database export or AI summary.$new$
  ),
  updated_at = now()
FROM public.skill_library AS library
WHERE target.skill_key = 'auto-skill-3-roas-launch-brief'
  AND library.skill_key = target.skill_key
  AND target.markdown_content = library.markdown_content;

UPDATE public.skill_library
SET
  markdown_content = replace(
    replace(
      markdown_content,
      $old$**What this is:** the consolidation + recommendation step. Skills 1 and 2 produce hypothesis and truth; this merges them, adds the creative layer, and hands the strategist ONE thing to approve.
**What this is not:** production. No finished ad sets, no page copy, no email sequences, no task tree — those come after approval (auto-skill-4 and the production skills).

---$old$,
      $new$**What this is:** the consolidation + recommendation step. Skills 1 and 2 produce hypothesis and truth; this merges them, adds the creative layer, and hands the strategist ONE thing to approve.
**What this is not:** production. No finished ad sets, no page copy, no email sequences, no task tree — those come after approval (auto-skill-4 and the production skills).

## MASTER WRITING STANDARD

Load `dylans-super-voice` and confirm it loaded before writing THE PLAN, starter copy, client approval message, client update, or recap. It is the only voice authority. Do not load `human-written-copy` or `dylans-voice`. Client samples and Brain context may add verified facts, vocabulary, and subject-matter texture, but they do not replace or override Dylan Super Voice.

Use the surface mode that matches the output: Long-Form Copy for marketing copy, Professional Message for client messages, and Operator Voice for internal team updates. Before saving, run the complete Dylan Super Voice checklist and search every shipping line for the literal `—` character. If the skill is unavailable, stop and report the missing skill instead of approximating the voice.

---$new$
    ),
    $old$- **All narrative prose runs through the dylans-super-voice / human-copy standard.** If it reads like a database export or an AI summary, rewrite it.$old$,
    $new$- **All narrative prose runs through Dylan Super Voice exclusively.** Keep `dylans-super-voice` loaded, do not combine it with either legacy voice skill, and rewrite anything that reads like a database export or AI summary.$new$
  ),
  updated_at = now()
WHERE skill_key = 'auto-skill-3-roas-launch-brief';

UPDATE public.agent_skill_resources AS target
SET
  content = replace(
    target.content,
    $old$One markdown record copy + one interactive HTML review copy. As long as it needs to be; the TL;DR does the at-a-glance job. All prose passes the dylans-super-voice / human-copy standard. Every section written for the person who wasn't on the call.$old$,
    $new$One markdown record copy + one interactive HTML review copy. As long as it needs to be; the TL;DR does the at-a-glance job. Load `dylans-super-voice` first and use it as the only voice authority for all prose, starter copy, client messages, and updates. Do not combine it with `human-written-copy` or `dylans-voice`. Every section is written for the person who was not on the call, then checked with the full Dylan Super Voice checklist and a literal `—` scan.$new$
  ),
  updated_at = now()
FROM public.skill_library_resources AS library
WHERE target.skill_key = 'auto-skill-3-roas-launch-brief'
  AND target.file_path = 'references/output-template.md'
  AND library.skill_key = target.skill_key
  AND library.file_path = target.file_path
  AND target.content = library.content;

UPDATE public.skill_library_resources
SET
  content = replace(
    content,
    $old$One markdown record copy + one interactive HTML review copy. As long as it needs to be; the TL;DR does the at-a-glance job. All prose passes the dylans-super-voice / human-copy standard. Every section written for the person who wasn't on the call.$old$,
    $new$One markdown record copy + one interactive HTML review copy. As long as it needs to be; the TL;DR does the at-a-glance job. Load `dylans-super-voice` first and use it as the only voice authority for all prose, starter copy, client messages, and updates. Do not combine it with `human-written-copy` or `dylans-voice`. Every section is written for the person who was not on the call, then checked with the full Dylan Super Voice checklist and a literal `—` scan.$new$
  )
WHERE skill_key = 'auto-skill-3-roas-launch-brief'
  AND file_path = 'references/output-template.md';

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT
  marker.user_id,
  marker.org_id,
  marker.agent_key,
  voice.skill_key,
  voice.name,
  voice.description,
  voice.markdown_content,
  true,
  'default'
FROM public.agent_skills AS marker
JOIN public.skill_library AS voice ON voice.skill_key = 'dylans-super-voice'
WHERE marker.skill_key <> 'dylans-super-voice'
  AND (marker.user_id IS NOT NULL OR marker.org_id IS NOT NULL)
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_skills (
  user_id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, source
)
SELECT DISTINCT
  NULL::uuid,
  NULL::uuid,
  definition.agent_key,
  voice.skill_key,
  voice.name,
  voice.description,
  voice.markdown_content,
  true,
  'system'
FROM public.agent_definitions AS definition
JOIN public.skill_library AS voice ON voice.skill_key = 'dylans-super-voice'
WHERE definition.user_id IS NULL
  AND definition.org_id IS NULL
ON CONFLICT (agent_key, skill_key) WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  markdown_content = EXCLUDED.markdown_content,
  is_enabled = true,
  source = 'system',
  updated_at = now();

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.skill_library
    WHERE skill_key = 'auto-skill-2-roas-strategy-adjust'
      AND markdown_content LIKE '%It is the only voice authority for the client strategy message%'
  ) THEN
    RAISE EXCEPTION 'Strategy-adjust Dylan Super Voice rule was not installed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.skill_library
    WHERE skill_key = 'auto-skill-3-roas-launch-brief'
      AND markdown_content LIKE '%All narrative prose runs through Dylan Super Voice exclusively%'
  ) THEN
    RAISE EXCEPTION 'Launch-brief Dylan Super Voice rule was not installed';
  END IF;
END
$verify$;

COMMIT;
