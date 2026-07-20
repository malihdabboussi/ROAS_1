# Changelog - July 20, 2026


## [2026-07-20 12:40] - [FIX]

What: Stopped Page Grader personal sync from minting duplicate personal campaigns when the scope map points at org campaigns; soft-deleted 6 personal Multifamily/Sakha duplicates; remapped scope map back to the org campaigns.
Why: `findCampaignById` filtered `org_id IS NULL` whenever personal integration sync passed `orgId=null`, so mapped org campaign ids missed and created another personal copy (4 Sakha / 2 Multifamily in personal).
Impact: Personal Campaigns list no longer shows those PG duplicates; org still has one Multifamily + one Sakha. Future syncs reuse the org campaign.
Files: `page-grader-client-import.service.ts`, tests, prod `campaigns.deleted_at`, `user_integrations.metadata.client_scope_map`

## [2026-07-20 12:24] - [FIX]

What: Backfilled 11 follow-up action items under this morning’s Nate/Dylan Fathom call; fixed automation resume so a failed agent wait still runs `agent_suggest_tasks` (and resume can resolve personal spaces via unscoped lookup).
Why: Vibey listed commitments in the meeting log/chat but never created nested follow-ups — resume aborted remaining steps on `task_failed`, so All Meetings showed the call with no children.
Impact: Refresh the call — follow-ups appear nested under it. Future Fathom Meeting Log runs keep creating follow-ups even when the agent wait fails. Needs `roas-api` deploy for the resume fix.
Files: `space-automation-service-07.base.ts`, `type-c-spaces-services-batch3.test.ts`, prod `space_items` under call `9bf47aa7-…`

## [2026-07-20 12:20] - [FIX]

What: Default All Meetings / Prep list views sort by `call_date` descending (newest first); applied to Dylan’s live Meetings + Personal Dashboard schemas and the Personal Dashboard template.
Why: Meetings stayed in manual `sort_order`, so today’s Fathom call was easy to miss lower in the list.
Impact: Refresh Meetings → All Meetings — newest calls at the top. New Personal Dashboards inherit the same default.
Files: `space-template-catalog-personal-dashboard.ts`, `space-template-catalog.test.ts`, prod `spaces.schema` for Meetings + Personal Dashboard

## [2026-07-20 10:31] - [FIX]

What: Campaign Knowledge chat now instructs Atlas to use `search_campaign_brain` with `campaign_id` (not `search_user_brain`); started embedding backfill for Multifamily/Sakha org campaign `ns_memories`.
Why: Campaign brains have `scope=campaign`, which `search_user_brain` / family filters drop — Atlas reported the graph as empty despite 500 objects. Memories were also inserted with `embedding=NULL`.
Impact: After web deploy, reopen Multifamily Campaign Knowledge and ask again — chat should retrieve client intel. Embeddings fill in as the backfill runs (lexical works sooner).
Files: `brain-chat-awareness.ts`, `BrainVisualization.tsx`, `scripts/roas/backfill-campaign-brain-embeddings.py`

## [2026-07-20 09:01] - [FIX]

What: Replaced ambiguous video overlay timing guidance with exact untimed overlay lines, added explicit no-timecode rejection to the atomic script skill and Copy Package gate, synced platform-managed hired-agent skill copies, and made Task 16 reject video editing timestamps and time ranges.

Why: The prior instruction to list overlay "moments" invited timestamped output, and no deterministic compilation rule caught it. Small prompt-only formatting rules could therefore disappear between source writing and the final Launch Bible.

Impact: Webinar video scripts now use exact overlay text in spoken order without editing timestamps. Clock ranges such as `0:00-0:05` and duration ranges such as `0-3s` are blocked before final compilation, while real event times such as `10:00 AM Pacific` remain valid.

Files: `docker/agents/templates/copywriter/skills/roas-video-ad-scripts/SKILL.md`, `docker/agents/templates/copywriter/skills/roas-webinar-copy-package/SKILL.md`, Webinar mission playbook and tests, Launch Bible action/preflight contracts and tests, `supabase/migrations/20260720093000_reject_video_script_timecodes.sql`, and `documentation/features/missions.md`.

## [2026-07-20 08:50] - [FIX]

What: Deployed Page Grader ingest so Campaign Knowledge dual-write works on future syncs (resolve campaign space, force indexSource, index up to 500 memories).
Why: Production API previously no-op'd semantic indexing without SPACE_* env flags, leaving Objects: 0 after successful brain syncs.
Impact: New/force Page Grader syncs populate space_semantic_objects without manual backfill.
Files: `page-grader-brain-package-ingest.service.ts`, `space-retrieval-index.service.ts`, `backfill-page-grader-campaign-knowledge.py`, `page-grader-campaign-brain-sync.md`

## [2026-07-20 08:27] - [FIX]

What: Backfilled Campaign Knowledge (`space_semantic_objects`) for the mapped Multifamily/Sakha campaigns the UI actually opens; fixed Page Grader ingest to force knowledge indexing and resolve campaign space when `spaceId` is missing; failed the stuck Atlas Multifamily `campaign_file_import` retry job.
Why: Sync wrote `ns_memories` but Campaign Knowledge reads semantic objects; `indexSource` no-op’d without SPACE_* env flags, so Objects stayed 0 / Last capture Never while “Retrying…” showed an old Atlas job.
Impact: Mapped Multifamily ≈1022 objects, Sakha ≈773 objects. Refresh Campaign Knowledge — should no longer be empty. Deploy API ingest fix so future syncs dual-write without another backfill.
Files: `page-grader-brain-package-ingest.service.ts`, `space-retrieval-index.service.ts` (`force`), `scripts/roas/backfill-page-grader-campaign-knowledge.py`, `documentation/features/page-grader-campaign-brain-sync.md`

## 2026-07-20 07:49 - [FIX]

What: Reset copied Google Doc character and paragraph formatting before reapplying Task 16 headings and emphasis, collapse consecutive duplicate lines, and reject post-webinar email/SMS sequences placed in P4 instead of tab 7.

Why: Launch Bible content could inherit underline, highlight, font size, indentation, and alignment from the master template. The compiler also allowed duplicate source lines and did not enforce the difference between replay landing-page copy and replay follow-up messages.

Impact: Newly compiled Webinar Launch Bibles use clean Arial body text with intentional headings, avoid consecutive duplicate content, keep P4 limited to on-page replay copy, and route replay delivery and post-webinar follow-up to 7 - SMS & Emails.

Files: `apps/api/src/modules/integrations/google-drive/services/markdown-to-google-docs-tab-requests.ts`, `apps/api/src/modules/integrations/google-drive/services/google-drive-composio-multi-tab-docs.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-webinar-launch-bible-preflight.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-action-schemas.ts`, `apps/agent-api/src/modules/agent-sync/data/vibey-api-action-docs.ts`, `apps/mission-worker/src/modules/missions/playbooks/webinar-fulfillment.playbook.ts`, related tests, and `documentation/features/missions.md`.

## 2026-07-20 08:07 - [FIX]

What: Set copywriter agents to Claude Opus 4.8 by default, made Dylan Super Voice an always-loaded copywriter rule, repaired the voice skill and model for existing Webinar copywriters, and added a deterministic Launch Bible rejection for client-facing em dashes.

Why: Copywriting tasks used mission-worker `auto`, which resolved to Claude Sonnet 4.6, while prompt-only voice instructions could be skipped. Task 16 then preserved invalid source copy instead of detecting the violation.

Impact: New and existing copywriters use Opus 4.8, must load Dylan Super Voice before drafting, and cannot compile client-facing Webinar copy with em dashes into the final Launch Bible.

Files: `apps/api/src/modules/missions/lib/agent-model-defaults.ts`, copywriter onboarding/provisioning and Webinar team reconciliation services, `docker/agents/templates/copywriter/TOOLS.md`, Launch Bible action/preflight tests and contracts, `supabase/migrations/20260720080728_copywriter_opus_super_voice_default.sql`, and `documentation/features/missions.md`.
