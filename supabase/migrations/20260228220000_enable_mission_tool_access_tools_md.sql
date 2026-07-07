DO $patch$
DECLARE
  mission_tools TEXT := $tools$# TOOLS.md — Mission Agent Tools

## Primary Tool: `vibey_backend`

Use the `vibey_backend` tool for all data operations. Your permissions are enforced server-side by RBAC — call the action and the backend will allow or block it based on your role and domain.

## Callback Contract

When reporting mission progress or completion, use:

- `POST /api/internal/missions/callback`
- `Authorization: Bearer {INTERNAL_API_TOKEN}`
- Body:
  - `mission_id`
  - `user_id`
  - `status` (`running` | `review` | `done` | `failed`)
  - `current_agent_key` (your agent key)
  - `event_type` (`mission.progress` | `mission.completed` | `mission.failed`)
  - `event_payload` (details)

Callbacks are for mission status reporting. Task execution actions (artifacts, media, integrations) run through `vibey_backend`.

### Integrations (ScrapeCreators)

For social media research, use `use_integration` with `service: "scrapecreators"`:

```
vibey_backend({ action: "use_integration", label: "Looking up the profile", data: {
  "service": "scrapecreators",
  "integration_action": "profile_lookup",
  "params": { "platform": "instagram", "handle": "garyvee" }
}})
```

Available integration actions: `profile_lookup`, `content_fetch`, `content_by_url`, `metrics`, `search`, `comments`
Supported platforms: `instagram`, `tiktok`, `youtube`, `linkedin`, `facebook`

### Documents & State

- `save_document` — save a deliverable document (pass title, content, document_type)
- `create_pdf` — create a branded PDF report (pass title, content, optional content_format, page_format, brand_theme)
- `list_documents` — list saved documents
- `update_state` / `get_state` — persist working state across steps
- `save_memory` / `search_memory` — store and recall campaign insights

### Other Actions

Your domain determines what else you can access (campaign assets, media generation, Meta read, GitHub read, etc.). Call the action — if it's outside your permissions, the backend returns an error. Don't guess; try.

## Tool Boundary

- Do NOT use `browser`, `web_search`, `web_fetch`, or any file system tools — they are disabled.
- Do NOT attempt to browse URLs directly. Use `use_integration` for social media data.
- If a tool call fails, report what happened — don't fabricate results.

## Output Delivery

Mission agents are the final creators. Publish your final artifacts directly with `vibey_backend` tools:

- Use `save_document` for authored text/JSON deliverables.
- Use `create_pdf` for authored PDF outputs.
- Use `generate_image` / `generate_video` for media and include returned `deliverable_id` values.
- If video is pending, poll `get_video_status` until it reaches a terminal status.

Return structured JSON that includes an `artifact_manifest` array with each published `deliverable_id`.

## Campaign Context

You receive campaign context with every mission, including:
- Campaign name and purpose
- Brand voice (tone, language patterns, words to use/avoid)
- Offer intelligence (what's being sold, to whom, positioning)
- Recent deliverables from prior missions
- Agent memory (what you've learned about this campaign)

Use this context to produce on-brand, informed output.$tools$;
BEGIN
  UPDATE agent_definitions
  SET content = mission_tools
  WHERE file_name = 'TOOLS.md'
    AND agent_key IN (
      'analyst',
      'copywriter',
      'designer',
      'media_producer',
      'brand_manager',
      'developer',
      'automation_integrations_engineer',
      'qa_engineer',
      'product_manager',
      'manager'
    )
    AND content <> mission_tools;
END;
$patch$;
