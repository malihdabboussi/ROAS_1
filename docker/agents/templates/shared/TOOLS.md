# TOOLS.md — Agent Tools

## Primary Tool: `vibey_backend`

Use the `vibey_backend` tool for all data operations. Your permissions are enforced server-side by RBAC — only actions allowed for your role and domain will work.

**Before using any action**, read `skills/vibey-api/SKILL.md` — it contains your complete list of available actions, parameters, and usage examples. Only actions listed there are available to you.

Never ask users for API keys, tokens, secrets, env vars, OAuth credentials, passwords, bearer tokens, or private keys. You cannot use credentials pasted in chat. Use only Vibey tools, connected integrations, and platform-managed credentials. If required access is missing, ask the user to connect the integration in Vibey or say the capability is unavailable.

## Pre-Call Schema Protocol

Every wrong parameter wastes a round-trip, burns tokens, and delays the user. Before calling any `vibey_backend` action, verify your arguments against the documented schema.

1. Look up the action in your `vibey-api` skill reference files. Find the exact JSON example for the action you are about to call.
2. Use only the parameter keys shown in that example. Do not guess aliases — `post_id` is not `social_post_id`, `funnel_id` is not `id`.
3. Confirm every required key is present and non-empty before sending the call.

**Example — right vs wrong:**

Delete a social post:

```
WRONG: { "action": "delete_social_post", "data": { "post_id": "abc-123" } }
RIGHT: { "action": "delete_social_post", "data": { "social_post_id": "abc-123" } }
```

The backend rejects unknown keys — guessing costs a full retry cycle.

## Integrations

If your system prompt includes a `<connected_integrations>` section, you can use external integrations. Before using any integration, discover its exact tool slugs with `search_available_integrations`, then execute with `use_integration`. Never guess tool slugs.

When calling `use_integration`, put provider-specific inputs inside `data.params` using the exact parameter names returned by the integration docs. Do not send provider inputs flat on `data`.

If no `<connected_integrations>` section is present, integrations are not available to you.

## Callback Contract (Missions only)

When reporting mission progress or completion, use:

- `POST /api/internal/missions/callback`
- `Authorization: Bearer {INTERNAL_API_TOKEN}`
- Body: `mission_id`, `user_id`, `status`, `current_agent_key`, `event_type`, `event_payload`

## Tool Boundary

- Do NOT use `browser` or file-system write/exec tools (`write`, `edit`, `apply_patch`, `exec`) — they are disabled.
- You MAY use `web_search` and `web_fetch` for live research. Prefer campaign brain / Vibey tools first; never invent receipts when search fails.
- Do NOT browse URLs via `browser`. Use `web_fetch` or `use_integration` for page content.
- If a tool call fails, report what happened — don't fabricate results.

## Chat Plans

For complex multi-step tasks, use `create_chat_plan` and `update_chat_plan` to show a structured progress tracker in the chat. Create a plan (2-8 items) at the start, then call `update_chat_plan` after each step to mark items as completed/in_progress/failed. See your `vibey-api` skill for parameter details.

## Campaign Context

You receive campaign context with every mission, including campaign name, brand voice, offer intelligence, recent deliverables, and agent memory. Use this context to produce on-brand output.
