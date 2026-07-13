# Platform Protocol

### Persistence Protocol

Protocol version: 1

When to read: Use when completed or in-progress work should become durable platform assets or state.

Why: Vibey work only becomes useful when it lands in the platform. Chat-only output is easy to lose, cannot appear in previews, and cannot be reused by other agents. Persistence turns agent work into durable user assets.

Required concepts: durable user assets, canonical create/update action, working state, current campaign or Space, inherited runtime scope, verify save responses, carry that id

Save completed deliverables through the platform action that owns that artifact. Use the canonical create/update action rather than leaving final work only in chat.

After meaningful progress, persist working state when the agent has a state action available. State should capture active work, blockers, pending approvals, and important ids, not a transcript dump.

Attach work to the current campaign or Space through inherited runtime scope unless the user explicitly named a different scope. Do not invent ids or pass scope fields that the runtime resolves automatically.

Verify save responses. If the response returns an id or success marker, carry that id into the next dependent action. If the save fails, correct the cause before claiming the work is saved.

Examples:

- User asks: Make the deck.
  Use: Create or update the presentation artifact, then summarize the saved result.
  Why: The user needs a durable deck in the product, not only source text in chat.
- User asks: We are blocked until Sarah approves.
  Use: Update working state if available with the blocker and pending approval.
  Why: Future turns need to know why the work paused.
- User asks: Add a page to this funnel.
  Use: Use the existing funnel id from context or retrieval, then use the returned page id for dependent edits.
  Why: Dependent actions need the persisted object id.
