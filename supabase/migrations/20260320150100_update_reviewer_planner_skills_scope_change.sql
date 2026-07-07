-- Update mission-reviewer skill to include scope-change capabilities (missionUpdates, addSubtasks, fullReplan).
-- Update mission-planner skill to handle replan context with completed subtask awareness.
-- Applied via Supabase MCP execute_sql on 2026-03-20.

UPDATE public.agent_skills
SET markdown_content = '# Mission Reviewer

> Read this skill before reviewing any mission output. Reviews that rubber-stamp work produce mediocre campaigns. Reviews that give specific, actionable feedback produce excellent ones.

## Why This Skill Exists

The reviewer is the quality gate between worker output and user-facing deliverables. A weak review lets subpar work through. An overly harsh review blocks progress on minor issues. The goal is to approve work that meets the brief and send back work that doesn''t — with specific reasons and guidance for revision.

Beyond quality gating, the reviewer is the only agent that can **change the mission''s scope** in response to user comments. If the user says "actually add a video version too" or "scrap the blog, do an email instead," your review response is where that change is expressed.

## Review Protocol

### Step 1: Load Context

Before judging output, understand what was asked for:
- Read the original mission brief and plan
- Read the subtask intent packet (why, story, sensory, endState, ecology)
- Read any user comments or revision feedback
- Check the latest user direction — it supersedes the original brief

### Step 2: Evaluate Against Intent

For each subtask deliverable, check:
1. Does it fulfill the endState from the intent packet?
2. Does it match the sensory description (looks/reads/feels as intended)?
3. Is it aligned with the story arc?
4. Does it respect the ecology (connections to other campaign assets)?
5. Does it meet the acceptance criteria from the plan?

### Step 3: Check User Comments for Scope Changes

Before making your final decision, re-read user comments. If the user''s latest direction implies:
- **Minor text changes** (title/brief wording) → use `missionUpdates`
- **Additional deliverables** that fit the current plan → use `addSubtasks`
- **A fundamentally different approach** → use `fullReplan`

Most reviews need none of these. Only use scope-change fields when user comments clearly indicate a change in direction.

### Step 4: Decide

- **Approve** when the deliverable meets intent and quality bar
- **Reject with feedback** when specific improvements are needed — always explain what to fix and why
- **Block** only when user input is genuinely required (missing information, conflicting direction)

## Scope Change Capabilities

These optional fields let you amend the mission without requiring a separate user action:

### missionUpdates (optional)

Patch the mission title or brief to reflect new user direction:
```json
"missionUpdates": { "title": "Updated title", "brief": "Updated brief" }
```
Only include fields that need changing. Omit fields that are fine as-is. Never send empty strings — that would clear the field.

### addSubtasks (optional, max 5)

Append new work items when the user requests additional deliverables that fit within the existing plan structure:
```json
"addSubtasks": [{
  "id": "new-1",
  "title": "Create video version of blog post",
  "assignTo": "designer",
  "dependsOn": ["existing-subtask-id-that-must-finish-first"],
  "intent": { "why": "...", "story": "...", "sensory": "...", "endState": "...", "ecology": "..." }
}]
```
Each new subtask follows the same intent-packet discipline as the planner. `dependsOn` can reference existing subtask IDs. Max 5 per review.

### fullReplan (use sparingly)

When the user''s comment means the entire approach must change — not just tweaks, but a different strategy:
```json
"fullReplan": true,
"replanReason": "User wants to pivot from blog content to an email drip sequence instead"
```
This cancels all incomplete subtasks and triggers a fresh planning phase. Completed work is preserved and made available to the new plan. Only use when incremental changes (reject + addSubtasks) are insufficient.

**Precedence rule:** When `fullReplan` is true, `subtaskReviews` are ignored — all non-done work will be cancelled regardless of individual verdicts.

## Quality Scoring

Rate output on a 1-10 scale considering: completeness, intent alignment, creative quality, technical correctness, and brand consistency.

## Output Contract

Return valid JSON only. For subtask reviews:
```json
{
  "subtaskReviews": [{ "subtaskId": "...", "approved": true/false, "feedback": "...", "reassignTo": "agent_key or omit" }],
  "qualityScore": 1-10,
  "missionUpdates": { ... },
  "addSubtasks": [ ... ],
  "fullReplan": false,
  "replanReason": "..."
}
```
Only `subtaskReviews` and `qualityScore` are required. All scope-change fields are optional.',
    description = 'Review completed mission outputs and subtask deliverables against original intent and quality bar. Can also amend mission scope (patch title/brief), append new subtasks (max 5), or trigger a full replan when user comments indicate a change in direction. Use whenever a mission enters the review phase or user feedback requires scope adjustment.'
WHERE skill_key = 'mission-reviewer'
  AND user_id IS NULL
  AND agent_key IN ('vibey', 'manager');

UPDATE public.agent_skills
SET markdown_content = '# Mission Planner

> Read this skill before producing any mission plan. The quality of the plan determines the quality of every deliverable downstream.

## Why This Skill Exists

Missions fail when they start with vague briefs. A plan that says "create emails" produces generic output. A plan that says "write a 5-email welcome sequence for sleep-deprived parents, each email building on the last pain point, with subject lines that create curiosity gaps" produces work that converts. The planner''s job is to bridge the gap between what the user said and what the worker needs to execute.

## Planning Protocol

### Step 1: Understand Before Decomposing

Before writing a single subtask:
1. What is the final deliverable the user expects to see?
2. What campaign context exists (offer, avatar, theme, prior work)?
3. What does "done" look like — specific acceptance criteria?
4. What constraints exist (brand voice, format, length)?

If ANY of these are unclear, return a `blocked` payload asking the user to clarify. Vague briefs produce vague output.

### Step 2: Decompose Into Subtasks (2-5 max)

Each subtask must be self-contained, sequential, specific, and measurable. The worker should be able to execute without asking questions.

### Step 3: Write Intent Packets

Every subtask carries a 5-field intent packet that gives the worker creative direction beyond just the task title:
- **why** — the business reason this subtask matters
- **story** — the narrative arc the deliverable should serve
- **sensory** — what the finished output looks, feels, or reads like
- **endState** — the measurable outcome when this subtask is done
- **ecology** — how this connects to other campaign assets

### Step 4: Assign Workers

Match each subtask to the best-fit worker from the provided worker list. Text-primary work goes to copywriters. Visual-primary work goes to designers. Never split one subtask across workers.

### Step 5: Campaign Context for Workers

The mission carries a `campaign_id` that the system automatically propagates to every subtask session. Workers inherit the campaign context and can query campaign knowledge without needing to pass `campaign_id` manually. When writing intent packets, reference campaign-specific facts (offer name, avatar details, brand voice) so workers produce contextually-aligned output instead of generic deliverables.

## Replanning a Mission

Sometimes a mission comes back to the planning phase after the reviewer triggered a **full replan**. When this happens, the prompt includes a `[REPLAN CONTEXT]` block with:

- **Reason for replan** — why the reviewer decided the current approach is insufficient
- **User comments** — the latest user direction that triggered the change
- **Completed subtask summaries** — titles and output excerpts of subtasks that finished successfully before the replan

### Replan Rules

1. **Reuse completed work.** Subtasks marked as `done` still exist with their outputs intact. Do not re-assign work that is already completed — build on it instead.
2. **Focus on what changed.** The replan reason tells you exactly what the user wants different. Address that specific change rather than starting from a blank slate.
3. **Reference completed outputs.** New subtasks can depend on completed ones via `dependsOn`. If the copywriter already wrote the blog post and the user now wants a social thread based on it, make the new subtask depend on the completed blog subtask.
4. **Keep the good parts.** If the original plan had subtasks that are still valid for the new direction, recreate them (they were cancelled, not preserved as-is). But do not blindly reproduce the old graph — think about whether each piece still serves the updated brief.

## Output Contract

Return valid JSON only. Include: title, summary, approach, subtasks (with intent packets), outOfScope, assignTo. If the mission cannot proceed, return `{ "kind": "blocked", "feedback": "what is needed" }`.',
    description = 'Plan missions by decomposing user requests into structured subtask trees with intent packets and worker assignments. Handles replans by reusing completed subtask outputs and focusing on the specific change the user requested. Use whenever a mission enters the planning phase, a user request needs breakdown into executable steps, or a blocked mission needs re-planning.'
WHERE skill_key = 'mission-planner'
  AND user_id IS NULL
  AND agent_key IN ('vibey', 'manager');
