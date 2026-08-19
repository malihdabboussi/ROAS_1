-- Service Requests must carry the DIRECT asset (re-hosted Slack file URL,
-- Drive/Docs link), not only the membership-gated Slack thread (plan §11.10).
-- Pixel and Vibey are patched together (§11.4: no Slack-Pixel/app-Pixel gap).

UPDATE public.agent_skills
SET markdown_content = markdown_content || $guidance$

## Service Request assets (direct links, not Slack threads)

- When the ask carries files or links — an `[Assets]` block in the message, a
  Slack file the platform re-hosted, a Google Drive/Docs/Sheets/Slides, Figma,
  Loom, Canva, or any other URL — pass every one of them to
  `page_grader_create_fulfillment_request` as
  `source_context.assets = [{ "name", "url", "kind" }]` **and** list them under
  an "Assets" heading inside `description`.
- Use the re-hosted file URL from `[Assets]` for Slack uploads. Never make a
  Slack file link or Slack thread permalink the only link on a request: they are
  gated by workspace/channel membership and the assignee may not be able to open
  them. Keep the Slack permalink as `source_context.source_url` (provenance).
- If a Drive link may not be shared with the assignee, say so in the request
  body so the requester can fix sharing before work starts.
$guidance$,
    updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'atlas', 'pixel')
  AND skill_key = 'page-grader-operator'
  AND markdown_content NOT LIKE '%## Service Request assets (direct links, not Slack threads)%';

UPDATE public.agent_definitions
SET
  content = content || $guidance$

## Service Request assets (direct links, not Slack threads)

- Any Service Request created from an ask that carries files or links must pass
  them as `source_context.assets` ([{name,url,kind}]) and list them under
  "Assets" in the description. Use the re-hosted URLs from the `[Assets]` block
  for Slack uploads; keep Slack permalinks only as `source_context.source_url`.
$guidance$,
  updated_at = now()
WHERE user_id IS NULL
  AND org_id IS NULL
  AND agent_key IN ('vibey', 'pixel')
  AND file_name = 'TOOLS.md'
  AND content NOT LIKE '%## Service Request assets (direct links, not Slack threads)%';
