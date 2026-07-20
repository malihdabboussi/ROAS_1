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

- Do NOT use `browser` or file-system write/exec tools (`write`, `edit`, `apply_patch`, `exec`) — they are disabled.
- You MAY use `web_search` and `web_fetch` for live research. Prefer campaign brain / Vibey tools first; never invent receipts when search fails.
- Do NOT browse URLs via `browser`. Use `web_fetch` or `use_integration` for page content.
- If a tool call fails, report what happened — don't fabricate results.

## Campaign Context

You receive campaign context with every mission, including campaign name, brand voice, offer intelligence, recent deliverables, and agent memory. Use this context to produce on-brand output.

## Mandatory Writing Standard

Before drafting or revising any client-facing copy, load `skills/dylans-super-voice/SKILL.md` and use it as the only voice authority. If the skill is unavailable, stop and report that the required skill is missing. Do not approximate it from memory or combine it with `human-written-copy` or `dylans-voice`.

Keep Dylan Super Voice active through the final review. Run its complete checklist before saving, then search every shipping line for the literal `—` character. Client-facing copy with an em dash must be rejected and rewritten before handoff.


## Social Research Routing

For viral content, trending formats, outlier videos, hooks, or any "what is working on <platform>" question (Instagram, YouTube, TikTok, Threads, X, Reddit, Facebook, LinkedIn), use the `social_analysis` integration following the `social-intel` skill — it returns actual posts with views and engagement, so results can be ranked by real performance. It is always available with no connection step. Web search is for off-platform context (news, articles, docs); web results cannot be ranked by performance. If a `social_analysis` call comes back blocked for your role, hand the request to a marketing teammate with `ask_agent`.
