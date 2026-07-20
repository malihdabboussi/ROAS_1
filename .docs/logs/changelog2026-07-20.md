# Changelog - July 20, 2026

## [2026-07-20 14:00] - [FEATURE]

What: Rebuilt Ads Research around visual Research Runs while retaining manual Library Search. Added a deterministic Atlas-to-Blaze mission for campaign context, current Meta analysis, competitive research, recommended ads and Dylan Super Voice copy, draft video scripts, and human approval. Updated the market-research skill contract to save native Space searches and use mission-specific document titles.
Why: Manual one-by-one ad-library search did not connect current account performance, campaign Brain context, competitive evidence, or usable recommendations into one reviewable workflow.
Impact: A campaign can now launch comprehensive ad research directly from its Ads Research view, inspect mission progress and native deliverables, and approve selected directions for a future Ad Creation mission. Research does not create final visuals, publish ads, or generate PDFs.
Files: Ads Research mission playbook and tests, Ads Research run workspace and launcher, toolbar surface bridge, mission payload builder, market-research skill migration and contract test, and social research documentation.

## [2026-07-20 13:58] - [FIX]

What: Pen / green New now start a fresh docked chat when the drawer is open, and restore the last thread when it is closed (shell conversation id stays in sync with the panel).
Why: Shell only cleared `chatDrawer.conversationId` / `activeConversationId`; `SpaceVibeyChatPanel` kept its own selection, and remounts revived the stored chat after a fresh-chat request.
Impact: Workspace routes: closed + pen → last chat; open + pen or green New → empty new chat in the drawer.
Files: `ShellChatDrawer.tsx`, `SpaceVibeyChatPanel.tsx`, `ShellChatDrawer.test.tsx`

## [2026-07-20 13:34] - [FIX]

What: Renamed the unified Paid Ads workspace modes to Analyze and Launch, placed Analyze first, and made Analyze the default for views without a saved mode.
Why: Paid Ads should open on existing campaign performance before presenting campaign creation and publishing controls.
Impact: New and legacy Paid Ads views open in Analyze, while an explicitly saved Launch selection remains respected.
Files: Paid Ads mode resolver, workspace toggle labels and tests, Paid Ads workspace test, and integration connection documentation.

## [2026-07-20 13:31] - [FEATURE]

What: Added a card/list toggle to Manage People, inline list controls for person type and agent delivery, and reusable Brain controls that can map a portal teammate or create a Slack-only Person Brain.
Why: Admins needed the fast one-click controls in list view and a durable Brain path for people who do not have portal accounts.
Impact: Slack-only people can now become organization-scoped contacts connected to Customer Brain, while portal teammates continue to use their own accessible User Brain. Creating the identity route does not automatically ingest Slack DMs.
Files: Slack People controller/service/repositories/tests, Team People roster/detail/hook/client/messages/tests, and integration connection documentation.

## [2026-07-20 13:14] - [FEATURE]

What: Post-call Slack confirm DM now includes a short meeting summary, Fathom recording link, and per-task owner; reaction confirm handler ships with deploy.
Why: Admins need call context and ownership when approving follow-ups from Slack.
Impact: After `roas-api` deploy, Fathom Meeting Log DMs Dylan with richer confirm copy; ✅ marks follow-ups confirmed (PG send only if client id set).
Files: `meeting-follow-up-slack-confirm.service.ts`, Slack events/service/types, automation DTOs/service/template/Flows UI, `spaces-automation.md`

## [2026-07-20 13:10] - [STYLE]

What: Slack welcome DM copy now says “Map a channel in the ROAS App” instead of “Vibey”.
Why: Branding — users should see ROAS App, not Vibey.
Impact: New Slack installs / welcome DMs after `roas-api` deploy. Existing welcome messages in Slack are unchanged.
Files: `slack-service-events.base.ts`

## [2026-07-20 12:58] - [FEATURE]

What: Unified the Paid Ads workspace with a saved Creating/Reporting toggle. Creating retains campaign, ad set, creative, and publishing controls; Reporting embeds the existing Meta sync and performance view under the same persistent Meta mapping bar.
Why: Meta mounting and ad creation appeared separate from importing and viewing live account performance, which made one connected workflow look like two unrelated products.
Impact: A user can map one Meta ad account and Page, then create ads or sync and review spend, leads, CTR, ROAS, and campaign performance from the same Paid Ads tab.
Files: Paid Ads view schema/mode resolver, toolbar toggle and tests, Paid Ads workspace/reporting adapter and tests, integration connection documentation.

## [2026-07-20 12:51] - [FEATURE]

What: Admin MVP for post-call Slack confirm — after Fathom Meeting Log suggests follow-ups, ROAS DMs Dylan with the task list; react ✅ to confirm (optional Page Grader send when `page_grader_client_id` is set). Wired live Meetings automation `6d05fd66-…`.
Why: Test the confirm → delegate loop in Slack DMs before Updates channels exist.
Impact: Needs `roas-api` deploy + Slack Event Subscription `reaction_added`. Next Fathom meeting with follow-ups should DM Dylan; ✅ replies with confirmed list.
Files: `meeting-follow-up-slack-confirm.service.ts`, Slack events/types, automation DTOs/service/template/Flows UI, `spaces-automation.md`, prod `space_automations` actions

## [2026-07-20 12:50] - [FIX]

What: Campaign Knowledge graph no longer hard-caps UI at 500 fake “Conversation docs”; Page Grader dual-write maps real source types, indexes the Space hub so structural edges exist, and Multifamily/Sakha prod rows were remapped + linked.
Why: Graph API defaulted to `limit=500` and reported `stats.total_objects = objects.length`; ingest forced every PG memory to `conversation_document` and never created a Space hub object, so edge writes skipped (`from` missing) → Connections: 0.
Impact: After API+web deploy, Campaign Knowledge shows true object counts (Multifamily ~1037, Sakha ~782), typed legend (channel messages / docs / avatars / offers), and Space→item connections. Prod data already repaired.
Files: `space-knowledge-graph.dto.ts`, `space-knowledge-graph.service.ts`, `space-retrieval.repository.ts`, `page-grader-brain-package-build.ts`, `page-grader-brain-package-ingest.service.ts`, `knowledge-graph.service.ts`, `knowledge-graph-mappers.ts`, `use-brain-visualization-graph-data.ts`, `scripts/roas/repair-page-grader-campaign-knowledge-graph.py`, docs



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
## [2026-07-20 13:15] - [FIX]

What: Repaired Meta Paid Ads reporting so completed registrations and purchases populate campaign results, Ads Manager links preserve the mapped ad account, and AI Analysis selects campaigns then opens a fresh Blaze chat with the visible reporting period and read-only snapshot.
Why: Reporting ignored Meta completed-registration actions, read ad-account context from a field the query did not return, and separately refetched all-time metrics before loading a generic publishing-oriented chat.
Impact: Webinar campaigns now show their real registration results, purchase campaigns retain purchase results, Meta opens the correct account and object, and Blaze analyzes only the campaigns and date range the user selected without requesting publishing setup.
Files: `meta-insights.repository.ts`, `meta-api.types.ts`, `meta-insights.service.ts`, `meta-sync.service.ts`, `analytics.service.ts`, `AdsPerformanceView.tsx`, `AdAnalysisPanel.tsx`, `meta-ads-analysis.ts`, tests, messages config, and `documentation/features/integration-connections.md`.

## [2026-07-20 13:45] - [FEATURE]

What: Made People conversations chronological and thread-aware with timestamps, actual-versus-sample labels, correct agent/human alignment, Slack formatting, and hover rationale; changed Slack-only Person Brains to distinct organization-managed User Brains; made checkmark confirmation acknowledge approval in the Slack thread and removed its Page Grader dispatch coupling.
Why: The review screen mixed real messages with phantom proposals, reversed the speakers, flattened Slack formatting, omitted thread replies and timestamps, and incorrectly modeled every unmapped person through Customer Brain. Checkmark approval also looked inert and crossed into the separate Page Grader product.
Impact: Admins can audit what actually happened versus what is only proposed, follow DM threads, understand why a draft exists, create a person-centric managed Brain, and receive an explicit ROAS confirmation reply after reacting in Slack. Group/channel inboxes and automatic Brain ingestion remain separately guarded follow-up work.
Files: Slack People API/types/repositories/tests and People conversation/Brain UI, `20260720220000_slack_managed_person_brains.sql`, meeting follow-up Slack confirmation service/action schemas/tests, `spaces-automation.md`, `integration-connections.md`, and follow-up work log.

## [2026-07-20 13:51] - [FIX]

What: Fixed Slack ✅ confirm so the thread gets a shareable summary reply by resolving the bot token from the org-scoped Slack channel (call items can have null org_id), and clarified that confirm stays in ROAS without Page Grader send.

Why: Reaction approved follow-ups in the DB but the thread reply failed silently when Slack lived on an org while the meeting call was personal (org_id null). Users saw no visible confirmation or shareable summary.

Impact: ✅ now posts a thread reply with meeting summary, Fathom link, owned follow-ups, and an explicit “not sent to Page Grader yet” note.

Files: `meeting-follow-up-slack-confirm.service.ts`, tests, changelog.

## [2026-07-20 13:55] - [FIX]
What: Set main ROAS account (`dylan@dylanvanas.com`) and ROAS org (`roas` / `f69bd799-…`) from Free/no-org-sub to active Ultra (`ultra-monthly`) on `roas-production`.
Why: User requested non-free / most premium self-serve tier for the main account and ROAS org.
Impact: User and org billing entitlement now Ultra (40k base credits catalog tier). Direct DB grant; no Stripe subscription attached.
Files: Operational update on Supabase `lhfgtsjetcardinpgouq` (`user_subscriptions`, `org_subscriptions`).

## [2026-07-20 14:05] - [FEATURE]

What: Added visible Slack channel context to People cards, list rows, person details, and People search, including a compact first-channel indicator with a complete hover list.
Why: Unfamiliar Slack identities could not be connected to the client or team channels that explain who they are.
Impact: Admins can identify people by shared channel context while every manually selected Internal, External, or Ignored classification remains unchanged during Slack refreshes. Channel context is fetched live and requires no database migration.
Files: Slack API integration, sender resolver, People API types/service, People roster/detail UI, messages config, focused tests, and `documentation/features/integration-connections.md`.

## [2026-07-20 14:15] - [FIX]
What: Fixed org Campaign Knowledge blank graph (edge query no longer uses a huge `.in(from_object_id)` that fails PostgREST on ~800 Sakha objects); remapped Page Grader `client_scope_map` to ROAS org Sakha/Multifamily; soft-deleted fresh empty personal duplicates; personal sync now upgrades stale personal mapped campaigns to the org campaign.
Why: User works in org; personal PG pulls were a bug. Scope map still pointed at empty personal Sakha, and the graph API failed loading edges for the filled org campaign.
Impact: Org Sakha/Multifamily scope map correct; empty personal dupes soft-deleted. API edge load fix needs deploy to clear blank Brain canvas.
Files: `space-retrieval.repository.ts`, `page-grader-client-import.service.ts`, tests; prod `user_integrations`/`campaigns` on `lhfgtsjetcardinpgouq`

## [2026-07-20 14:18] - [FIX]

What: Made meeting Slack confirm messages a compact shareable recap (Purpose + Key takeaways + owned action items), converted Fathom markdown timestamp links to Slack mrkdwn, and stopped dumping Topics so messages no longer cut off mid-word.

Why: Full call notes exceeded Slack’s length limit and left `[label](url)` links unclickable, so the confirm reply was not usable to forward into a channel or to another attendee.

Impact: Review DMs and ✅ confirm replies are complete, linkable, and copy/forward-ready without Page Grader.

Files: `meeting-follow-up-slack-confirm.service.ts`, `meeting-follow-up-slack-message.ts`, tests, changelog.

## [2026-07-20 14:24] - [FIX]
What: Deployed `roas-api` production from `af12111d` (Campaign Knowledge edge load by space_id). Vercel deployment `dpl_BCZP1h3ep6pBmX4XVLn7YQuaYTAQ` READY.
Why: Ship the blank org Sakha Campaign Knowledge graph fix to `api.roas.io`.
Impact: Org Campaign Knowledge graphs with large object sets should load instead of returning empty after edge-query failure.
Files: Operational deploy of `apps/api` space-retrieval edge fix.

## [2026-07-20 14:28] - [FIX]

What: Rendered Fathom owner timestamp links in “From the call” as bold name headers with tasks nested under them, instead of hyperlinked name bullets.

Why: Fathom stores owners as `[Nate:](url)` list items; converting those to Slack bullets made names look like weird linked bullets.

Impact: From the call reads as Nate / Dylan / Aaron sections with clickable names and normal task bullets underneath.

Files: `meeting-follow-up-slack-message.ts`, tests, changelog.

## [2026-07-20 14:35] - [DOCS]

What: Added feature doc for meeting follow-up Slack confirm covering status, data flow, file map, test IDs, commits, and SlotBot skill plan.

Why: Need a single place that explains the MVP and what was built across this chat.

Impact: `documentation/features/meeting-follow-up-slack.md` is the source of truth; spaces-automation links to it.

Files: `documentation/features/meeting-follow-up-slack.md`, `documentation/features/spaces-automation.md`.

## [2026-07-20 14:36] - [FIX]

What: Removed hyperlinks from “From the call” owner names; they now render as plain `*Nate’s action items*` headers.

Why: Fathom timestamp URLs on names looked like weird linked bullets and weren’t needed — ownership already appears on the action-items list and the recording link is separate.

Impact: From the call sections read as normal owner headers with task bullets.

Files: `meeting-follow-up-slack-message.ts`, tests, `meeting-follow-up-slack.md`.
