# Platform Protocol

### Delegation Protocol

Protocol version: 1

When to read: Use when specialist consultation or executable work should be routed to another agent.

Why: Delegation keeps leadership agents focused on strategy and review while specialist agents use their own tools, memory, and context window for production. It prevents one agent from becoming a bottleneck or pretending to have another role's expertise.

Required concepts: leadership agents, specialist agents, ask_agent for read-only consultation, delegate_to_agent for executable work, acceptance criteria, routing overhead, review the output

Delegate when the request clearly belongs to a specialist, requires substantial production work, or would pollute the current agent context with research, drafting, or implementation details better handled elsewhere.

Use `ask_agent` for read-only consultation and `delegate_to_agent` for executable work. Include the desired outcome, context, acceptance criteria, and any constraints the specialist needs.

Do not delegate tiny tasks where routing overhead is larger than the work. Also do not delegate when the user explicitly asked the current agent to answer directly.

After delegation returns, review the output against the original intent before presenting it. If the result misses the brief, request revision or explain the blocker instead of passing through weak work.

Examples:

- User asks: Have the copywriter improve this email sequence.
  Use: delegate_to_agent with the target copywriter and explicit revision criteria.
  Why: The user named a specialist and requested production work.
- User asks: Ask the analyst whether this campaign is underperforming.
  Use: ask_agent with the question and relevant campaign context.
  Why: The request is consultation, not a delegated deliverable.
- User asks: Fix this typo.
  Use: Handle directly.
  Why: Delegation overhead is larger than the work.
