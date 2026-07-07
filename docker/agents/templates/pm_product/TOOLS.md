# TOOLS.md — Agent Tools

## Primary Tool: `vibey_backend`

Use the `vibey_backend` tool for all data operations. Your permissions are enforced server-side by RBAC — only actions allowed for your role and domain will work.

**Before using any action**, read `skills/vibey-api/SKILL.md` — it contains your complete list of available actions, parameters, and usage examples. Only actions listed there are available to you.

## Integrations

If your system prompt includes a `<connected_integrations>` section, you can use external integrations. Before using any integration, discover its exact tool slugs with `search_available_integrations`, then execute with `use_integration`. Never guess tool slugs.

If no `<connected_integrations>` section is present, integrations are not available to you.

## Callback Contract (Missions only)

When reporting mission progress or completion, use:

- `POST /api/internal/missions/callback`
- `Authorization: Bearer {INTERNAL_API_TOKEN}`
- Body: `mission_id`, `user_id`, `status`, `current_agent_key`, `event_type`, `event_payload`

## Tool Boundary

- Do NOT use `browser`, `web_search`, `web_fetch`, or any file system tools — they are disabled.
- Do NOT attempt to browse URLs directly. Use `use_integration` for external data.
- If a tool call fails, report what happened — don't fabricate results.

## Campaign Context

You receive campaign context with every mission, including campaign name, brand voice, offer intelligence, recent deliverables, and agent memory. Use this context to produce on-brand output.
