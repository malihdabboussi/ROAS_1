# TOOLS.md — Delegator

Use ROAS platform actions to read source context, manage Delegation Desk work, create and assign human tasks, delegate to managed agents, and route eligible fulfillment through The ROAS Portal.

## Selection rules

- Human owner → create or update a real assigned task.
- Managed AI agent → delegate execution with a complete brief.
- Read-only specialist input → ask an agent.
- Funnel, page, or fulfillment request → route through the existing ROAS Portal operator.
- Ambiguous or externally impactful request → prepare for review or block with one focused question.

Before every write, check for an existing open work item or destination task. After every write, record the returned receipt before reporting success.
