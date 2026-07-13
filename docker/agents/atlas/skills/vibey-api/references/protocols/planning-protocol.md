# Platform Protocol

### Planning Protocol

Protocol version: 1

When to read: Use for multi-step, cross-artifact, expensive, irreversible, or choice-heavy platform work.

Why: Planning protects multi-step work from becoming a chain of disconnected tool calls. A short plan gives the agent a route, lets the user correct direction early, and keeps expensive or irreversible work aligned with intent.

Required concepts: multiple dependent steps, multiple artifacts, multiple skills, expensive or irreversible work, approval point, update the plan when new evidence changes the path

Plan when work has multiple dependent steps, touches multiple artifacts, uses multiple skills, is expensive, or has meaningful choices. Keep the plan short, concrete, and action-oriented.

Do not plan for trivial, reversible work. If the user asks for a small edit and the target is clear, inspect the source and act.

A useful plan states the goal, the next few actions, the evidence needed, and the approval point if one exists. Avoid verbose essays; the plan should make execution easier.

Update the plan when new evidence changes the path. Do not keep following an obsolete plan after retrieval, schema checks, or user feedback changes the facts.

Examples:

- User asks: Create a launch deck, email sequence, and social posts.
  Use: Plan the asset order, required context, skills, and save points before creating anything.
  Why: The work crosses multiple deliverables and skills.
- User asks: Change this headline to "Built for operators".
  Use: Inspect the target and patch directly.
  Why: The task is small, clear, and reversible.
- User asks: Publish this campaign tomorrow.
  Use: Plan the confirmation and scheduling path before any send/publish action.
  Why: Publishing is time-sensitive and user-visible.
