---
name: chat-plan-management
description: Create and manage structured to-do lists in chat for complex multi-step tasks. Use when a task has 3+ steps, the user asks you to plan something, or you are about to execute a multi-asset workflow. Plans show real-time progress to the user.
---

# Chat Plan Management — Structured Progress in Chat

## When to Create a Plan

Create a plan when ANY of these apply:

- **Multi-step workflow**: The task requires 3+ distinct tool calls (e.g. offer → funnel → sequence)
- **User requests it**: They say "plan this", "break this down", "show me the steps"
- **Complex build**: Creating multiple related assets in a single session
- **Phased work**: Work that has a clear beginning, middle, and end

## When NOT to Create a Plan

- Single-step tasks (just do them)
- Quick edits or updates to existing assets
- Questions, clarifications, or information requests
- Tasks with only 1-2 tool calls

## Creating a Plan

Call `create_chat_plan` at the START of a complex task, BEFORE doing any work:

```
vibey_backend({
  action: "create_chat_plan",
  label: "Planning your campaign setup",
  data: {
    "title": "Launch Campaign Setup",
    "summary": "Building your complete launch funnel from scratch",
    "items": [
      { "id": "offer", "title": "Create the irresistible offer" },
      { "id": "funnel", "title": "Build the landing page funnel" },
      { "id": "sequence", "title": "Design the welcome email sequence" },
      { "id": "thankyou", "title": "Set up the thank-you page" }
    ]
  }
})
```

**Rules for items:**
- 2-8 items. More than 8 means split into phases.
- Each needs a unique `id` (short, descriptive: "offer", "step-1", "landing-page")
- Titles must be action-oriented verbs: "Create the...", "Build the...", "Set up the..."
- Order items by execution sequence
- Keep titles concise (3-8 words)

## Updating Progress

After completing each significant step, call `update_chat_plan`:

```
vibey_backend({
  action: "update_chat_plan",
  label: "Updating progress",
  data: {
    "plan_id": "plan-...",
    "items": [
      { "id": "offer", "status": "completed", "note": "High-ticket coaching offer" },
      { "id": "funnel", "status": "in_progress" },
      { "id": "sequence", "status": "pending" },
      { "id": "thankyou", "status": "pending" }
    ]
  }
})
```

**Status values:**
- `pending` — not started yet
- `in_progress` — currently working on this
- `completed` — done (add a short `note` summarizing what was created)
- `failed` — couldn't complete (add `note` explaining why)
- `skipped` — intentionally skipped (add `note` explaining why)

**Update cadence:**
- Mark the next item as `in_progress` before you start working on it
- Mark the current item as `completed` after the work tool call succeeds
- Batch these: mark current as completed + next as in_progress in one update
- When ALL items are done, add `"plan_status": "completed"` to the data

## The plan_id

`create_chat_plan` returns a response containing the `plan_id`. Extract it and pass it to every `update_chat_plan` call. The plan_id looks like `plan-1234567890-abc123`.

## Example Full Flow

1. User: "Build me a complete launch funnel with offer, landing page, and email sequence"
2. You: Create plan with 4 items → acknowledge the plan to the user
3. You: Mark "offer" as in_progress → call create_offer → mark "offer" as completed + "funnel" as in_progress
4. You: call create_funnel + add_funnel_page → mark "funnel" as completed + "sequence" as in_progress
5. You: call create_sequence + add_sequence_email → mark "sequence" as completed + "thankyou" as in_progress
6. You: call add_funnel_page for thank-you → mark "thankyou" as completed + plan_status: completed
7. You: Summarize everything that was built
