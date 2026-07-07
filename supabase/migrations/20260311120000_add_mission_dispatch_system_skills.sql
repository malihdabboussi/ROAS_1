-- Add/refresh mission dispatch skills for system Vibey.

DELETE FROM public.agent_skills
WHERE user_id IS NULL
  AND agent_key = 'vibey'
  AND skill_key IN (
    'mission-planner',
    'mission-reviewer',
    'awareness-evaluator',
    'mission-worker-executor'
  );

INSERT INTO public.agent_skills (
  user_id,
  agent_key,
  skill_key,
  name,
  description,
  markdown_content,
  is_enabled
)
VALUES
  (
    NULL,
    'vibey',
    'mission-planner',
    'Mission Planner',
    'Plan missions by reading this skill first, then return structured subtasks and intent packets.',
    '# Mission Planner

Read this skill before producing mission plans.

## Contract
- Return valid JSON plan output only.
- Assign subtasks to best-fit workers from provided worker list.
- Include intent packet fields for each subtask: why, story, sensory, endState, ecology.
- If mission cannot proceed, return blocked payload with explicit user ask.
',
    true
  ),
  (
    NULL,
    'vibey',
    'mission-reviewer',
    'Mission Reviewer',
    'Review mission outputs/subtasks against intent and quality criteria.',
    '# Mission Reviewer

Read this skill before reviewing mission outputs.

## Contract
- Return valid JSON review output only.
- Evaluate against intent alignment and quality.
- Approve when complete; reject with specific revision feedback when incomplete.
- Block only when user input is truly required.
',
    true
  ),
  (
    NULL,
    'vibey',
    'awareness-evaluator',
    'Awareness Evaluator',
    'Evaluate campaign/user signals and decide whether to notify, act, or wait.',
    '# Awareness Evaluator

Read this skill before awareness cycles.

## Contract
- Return valid JSON decision output only.
- Decision must be one of: notify, act, wait.
- Propose missions only when action is justified by current signals.
- Keep updates concise and operational.
',
    true
  ),
  (
    NULL,
    'vibey',
    'mission-worker-executor',
    'Mission Worker Executor',
    'Execute assigned mission/subtask deliverables using provided context and constraints.',
    '# Mission Worker Executor

Read this skill before executing mission work.

## Contract
- Produce complete deliverable output for assigned task scope.
- Respect intent packet and latest user direction.
- Resume from completed actions instead of duplicating artifacts.
- Return valid JSON payload for execution responses.
',
    true
  );
