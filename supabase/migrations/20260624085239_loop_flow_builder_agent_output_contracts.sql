-- Teach Loop's DB-backed Flow Builder skill the existing send_to_agent
-- output/completion contract. This exposes current platform capability to the
-- agent without adding compiler normalization or hidden runtime rewrites.

UPDATE public.agent_skills
SET
  markdown_content = CASE
    WHEN markdown_content LIKE '%references/agent-run-output-contracts.md%' THEN markdown_content
    WHEN markdown_content LIKE '%## Backend Actions%' THEN replace(
      markdown_content,
      '## Backend Actions',
      '## Agent Run Outputs

Read `references/agent-run-output-contracts.md` when a Flow sends work to an agent and the requested result should persist as an artifact, report, brief, document, draft, or sample content, or when the task should move status after the agent finishes. The `send_to_agent` action owns `output_type`, `continuation`, and `completed_status`; put those fields on the agent step instead of modeling the same completion as a separate immediate status-change step.

## Backend Actions'
    )
    ELSE markdown_content || '

## Agent Run Outputs

Read `references/agent-run-output-contracts.md` when a Flow sends work to an agent and the requested result should persist as an artifact, report, brief, document, draft, or sample content, or when the task should move status after the agent finishes. The `send_to_agent` action owns `output_type`, `continuation`, and `completed_status`; put those fields on the agent step instead of modeling the same completion as a separate immediate status-change step.'
  END,
  updated_at = now()
WHERE agent_key = 'loop'
  AND skill_key = 'flow-builder'
  AND user_id IS NULL
  AND org_id IS NULL
  AND markdown_content NOT LIKE '%references/agent-run-output-contracts.md%';

INSERT INTO public.agent_skill_resources (
  user_id,
  org_id,
  agent_key,
  skill_key,
  file_path,
  content,
  content_type
)
VALUES (
  NULL,
  NULL,
  'loop',
  'flow-builder',
  'references/agent-run-output-contracts.md',
  $md$# Agent Run Output Contracts

Use this reference when a Flow asks an agent to do work and the result needs to be durable, reviewable, or tied to a completion status.

## Decision

`send_to_agent` can describe the agent run, its durable output, and its completion status in one action. Use those fields directly so the Flow remains readable: one agent step does the work, creates the expected artifact, then moves the task when the run is complete.

## Fields

- `output_type`: Set this when the agent should create a durable artifact. Use `document_artifact` for strategy briefs, research reports, written plans, review packets, and sample-content documents.
- `continuation`: Use `after_task_completes` when `output_type` is set or later steps depend on the agent result.
- `completed_status`: Use the real Space status option ID when the task should move after the agent run completes.
- `agent_collaboration`: Use `allowed` when the agent may coordinate with other agents while doing the work.
- `extended_brain_knowledge`: Use `true` when the agent should ground the run in available Brain knowledge.

## Protocol

1. Inspect `action.send_to_agent` with `get_flow_capability` when the Flow contains an agent-run step.
2. If the prompt says return, write, compile, produce, draft, or create a brief/report/document/sample deliverable, set `output_type`.
3. If the deliverable is written strategy, research, planning, sample copy, or a review packet, default to `output_type: "document_artifact"`.
4. If the next state is "ready for review", set `completed_status` on the same `send_to_agent` action using the review status option ID.
5. Use an `add_comment` after the agent step only for human review instructions, approval notes, or revision guidance.
6. Do not add a separate immediate `change_status` action for the same completion state already represented by `completed_status`.
7. If a Brain write/crystallization request has no compile-ready Flow executor or active blueprint, surface the bridge requirement. Do not hide that gap by creating a vague manual task unless the user asked for a manual task.

## Example

User asks: "When a task moves to RESEARCH, run strategic research, create the strategy brief, then move it to review."

Use one agent action:

```json
{
  "type": "send_to_agent",
  "agent_key": "vibey",
  "prompt_template": "Run strategic research for {{task.title}} and create a concise strategy brief with findings, positioning, content angles, and recommended next steps.",
  "agent_collaboration": "allowed",
  "output_type": "document_artifact",
  "continuation": "after_task_completes",
  "completed_status": "in_review"
}
```

Then add a comment only if the human needs review instructions:

```json
{
  "type": "add_comment",
  "message_template": "Strategic research is ready for review. Approve it, request revisions, or move the task back to RESEARCH with feedback."
}
```

Do not split the same completion into:

```json
[
  { "type": "send_to_agent", "agent_key": "vibey", "prompt_template": "Create the strategy brief." },
  { "type": "change_status", "status": "in_review" }
]
```
$md$,
  'text/markdown'
)
ON CONFLICT (agent_key, skill_key, file_path)
WHERE user_id IS NULL AND org_id IS NULL
DO UPDATE SET
  content = EXCLUDED.content,
  content_type = EXCLUDED.content_type,
  updated_at = now();
