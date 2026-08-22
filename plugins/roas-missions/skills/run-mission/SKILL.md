---
name: run-mission
description: >-
  Run, supervise, or verify work as a ROAS mission through the ROAS MCP connector. Use when
  the user asks Claude to run, start, launch, monitor, inspect, continue, or prove a ROAS/Vibey
  mission, execute work through the ROAS agent team, or collect mission logs and deliverables.
argument-hint: '[mission brief or mission id]'
---

# Run a ROAS mission

Use the `roas-platform` MCP tools. A created mission is only a launch receipt; completion requires persisted state and output evidence.

## Workflow

1. If the user supplied a mission id, skip creation and inspect it.
2. Resolve scope with `list_campaigns` and `list_spaces`. Reuse exact ids supplied by the user. Ask one concise question only when multiple plausible scopes remain.
3. Before an unfamiliar call, use `describe_vibey_action` for the underlying action contract.
4. Create the mission with `create_mission`. Include:
   - a concrete title and complete brief;
   - `campaign_id` and `space_id` when scoped;
   - the canonical `playbook_id` when the user named a supported playbook;
   - a stable `idempotency_key` derived from the scope and request, so retrying the same launch cannot duplicate it.
5. Preserve the returned mission id. Inspect it with `get_mission`, `get_mission_plan`, `list_mission_subtasks`, and `get_mission_logs`.
6. If state is `awaiting_human`, explain the exact gate and stop for the user's decision. Do not approve or simulate human review.
7. Before reporting success, call `get_mission_deliverables`. Match outputs to the brief and identify missing or failed subtasks.

Do not busy-loop. Recheck when a tool result indicates progress or when the user asks for an update. Follow a structured error's `retry_policy` and `agent_instruction`; do not repeat the same payload when it says to stop or correct it.

## Report

Lead with the outcome, then include:

- mission id and current status;
- completed, active, failed, or human-gated subtasks;
- durable deliverables with ids or URLs;
- missing evidence or next required action.

Never claim a tool, integration, test, or deliverable ran when only a plan or mission row exists.

## Examples

**Launch:** “Run a ROAS mission to QC the live Impact funnel on desktop and mobile.” Resolve the campaign and Space, create one idempotent mission, then supervise it and require screenshot/click-through deliverables before calling it complete.

**Inspect:** “How did mission `abc` go?” Call the mission, plan, subtask, log, and deliverable read tools. Report failed or gated steps directly instead of relaunching the work.
