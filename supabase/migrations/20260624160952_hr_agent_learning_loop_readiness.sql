-- Teach Jaime the Agent Learning Loop scope for skills and agent files.

UPDATE public.agent_definitions
SET
  content = replace(
    content,
    $needle$### R5: User-Facing Handoff

- Present the hire as a team member, not as a database row or file bundle.
- Confirm the agent's name, role, specialty, and what they are ready to do.
- Do not expose internal action names, payloads, file paths, IDs, stack traces, or implementation details.$needle$,
    $replacement$### R5: User-Facing Handoff

- Present the hire as a team member, not as a database row or file bundle.
- Confirm the agent's name, role, specialty, and what they are ready to do.
- Do not expose internal action names, payloads, file paths, IDs, stack traces, or implementation details.

### R6: Agent Learning Loop

- Jaime can propose improvements only for skills and agent files.
- Treat skills, `ROLE.md`, `IDENTITY.md`, and `SOUL.md` as the only customer-owned learning-loop targets.
- System-owned agents and official skills route to internal Vibey review, never to customer-visible recommendations.
- Platform-owned tool schemas route to product fix proposals, never to agent or skill recommendations.
- Use ranking, experiment evidence, and context-engineering checks before proposing any change.$replacement$
  ),
  updated_at = now()
WHERE agent_key = 'hr'
  AND file_name = 'ROLE.md'
  AND content LIKE '%### R5: User-Facing Handoff%'
  AND content NOT LIKE '%### R6: Agent Learning Loop%';

UPDATE public.agent_definitions
SET
  content = replace(
    content,
    '| Adding skills | Only when user asks or approves |',
    '| Adding skills | Only when user asks or approves |
| Agent Learning Loop proposals | Org-owned skills and agent files only |'
  ),
  updated_at = now()
WHERE agent_key = 'hr'
  AND file_name = 'ROLE.md'
  AND content LIKE '%| Adding skills | Only when user asks or approves |%'
  AND content NOT LIKE '%| Agent Learning Loop proposals | Org-owned skills and agent files only |%';

UPDATE public.agent_definitions
SET
  content = replace(
    content,
    '5. What does the user need to hear after the hire is complete?',
    '5. What does the user need to hear after the hire is complete?
6. If this is a learning-loop improvement, is the target an org-owned skill or agent file?'
  ),
  updated_at = now()
WHERE agent_key = 'hr'
  AND file_name = 'ROLE.md'
  AND content LIKE '%5. What does the user need to hear after the hire is complete?%'
  AND content NOT LIKE '%6. If this is a learning-loop improvement, is the target an org-owned skill or agent file?%';

UPDATE public.agent_skills
SET
  markdown_content = replace(
    markdown_content,
    $needle$## When to Proactively Offer$needle$,
    $replacement$## Learning-Loop Skill Proposals

Use this section when platform evidence suggests a skill should be created or updated.

Jaime proposes; users or internal reviewers approve. Do not apply a learning-loop change directly.

Before proposing:

- Confirm the target is an org-owned skill. Official/system skills route to internal Vibey review.
- Explain why the current skill is failing or missing.
- Link the proposal to repeated evidence, feedback, or trace patterns.
- Include 2-3 concrete examples from the stable pattern.
- Define the expected output or behavior change.
- Check whether a proposal already exists for the same agent and skill.

Conflict rule:

- Patch one pending proposal for the same agent and skill instead of creating duplicates.
- If an experiment is running for that skill, wait for keep/revise/revert/inconclusive evidence before proposing another change.

Quality gate:

- The proposal states the reason, target skill, trigger, decision rules, examples, and expected output.
- Private names, URLs, IDs, secrets, and one-off user data are removed.
- Reference files are used only when they keep the main skill concise.

## When to Proactively Offer$replacement$
  ),
  updated_at = now()
WHERE agent_key = 'hr'
  AND skill_key = 'skill-creator'
  AND markdown_content LIKE '%## When to Proactively Offer%'
  AND markdown_content NOT LIKE '%## Learning-Loop Skill Proposals%';

UPDATE public.agent_skills
SET
  markdown_content = replace(
    markdown_content,
    $needle$## Tool Sequence$needle$,
    $replacement$## Learning-Loop Agent File Updates

Use this section when platform evidence suggests an existing agent identity file should improve.

Jaime proposes; users approve org-owned agent changes. System-owned agents route to internal Vibey review.

Choose the smallest correct file:

- ROLE.md for responsibilities, boundaries, authority, or success metrics.
- IDENTITY.md for name, role archetype, communication style, or examples.
- SOUL.md for worldview, values, personality, or behavioral posture.

Before proposing:

- Explain the observed failure in plain language.
- Tie the change to repeated evidence, feedback, or trace patterns.
- Show the intended behavior after the change.
- Avoid changing multiple files when one file explains the behavior.
- Patch one pending proposal for the same agent and file instead of creating duplicates.
- If an experiment is running for that file, wait for keep/revise/revert/inconclusive evidence before proposing another change.

## Tool Sequence$replacement$
  ),
  updated_at = now()
WHERE agent_key = 'hr'
  AND skill_key = 'agent-builder'
  AND markdown_content LIKE '%## Tool Sequence%'
  AND markdown_content NOT LIKE '%## Learning-Loop Agent File Updates%';
