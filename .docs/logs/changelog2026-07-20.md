# Changelog - July 20, 2026

## [2026-07-20 16:29] - [FIX]

What: Org sidebar spaces cache now also loads personal-account spaces (`orgId: null`) and merges them, so the injected Personal campaign shows Meetings instead of “No spaces yet”. Creating a space under Personal from org context writes to the personal account.
Why: Campaigns injects personal-account Personal into org lists, but spaces stayed org-scoped — Meetings (`org_id IS NULL`, already on Personal) never appeared.
Impact: In an org, Campaigns → Personal shows your personal Meetings / task list; new spaces under Personal stay personal-account scoped.
Files: `use-cached-spaces.ts`, `use-cached-spaces.test.tsx`, `spaces.service.ts` (`createSpace` backend options), `useSidebarController.ts`.

## [2026-07-20 16:10] - [FIX]

What: Seeded Space chat messages now create and persist the fresh conversation with the explicitly requested agent key, even when the panel was still rendering the previously active agent.
Why: Run Research requested Blaze through `ads_manager`, but the synchronous seed event sent the first message before React applied the agent switch, so the new conversation was created for Vibey.
Impact: Run Research and other agent-specific chat launchers send their first message to the requested agent instead of the previously active agent.
Files: `SpaceVibeyChatPanel.tsx`, `space-vibey-chat-panel.logic.ts`, and focused logic tests.

## [2026-07-20 15:18] - [FEATURE]

What: Agenda now merges unmatched personal Meetings Fathom `entry_type=call` rows into the calendar window as Fathom-badged rows; opening one opens the existing call item. Agenda enrichment runs even with no calendar connected. Applied Personal campaign uniqueness + rehome migrations on ROAS.
Why: Phase 4 of Personal Home — Fathom recordings without a matching calendar event were invisible on Agenda; Personal campaign DB foundation needed on ROAS.
Impact: Home Agenda = calendar events ∪ unmatched Fathom calls in range; matched calls stay related attachments. ROAS now has `idx_campaigns_single_personal_per_user` and personal Meetings rehomed under Personal.
Files: `meetings-precall-prep.helpers.ts`, `meetings-precall-prep.service.ts`, `integrations-calendar.service.ts`, `calendar-api.ts`, `AgendaCard.tsx`, `AgendaCardEventEntry.tsx`, migrations, helper tests.

## [2026-07-20 15:13] - [FIX]

What: Hub dock flyouts no longer dismiss on mousedown inside portaled context menus (Brain/Team/Campaigns New tab and actions), and docked chat pen/green New start a fresh thread when open while closed+pen restores the last chat.
Why: Portaled menus lived outside `[data-hub-dock-flyout]` so outside-click unmounted them before handlers ran; shell fresh-chat only cleared drawer ids while SpaceVibeyChatPanel kept/restored its selection.
Impact: Brain/Team/Campaigns item menus work from the dock; workspace pen/New match open→fresh and closed→last-chat.
Files: `HubDockFlyout.tsx`, `floating-control-attrs.ts`, brain/space/campaign/team/channel menus, `IconLibraryPopup.tsx`, `ShellChatDrawer.tsx`, `SpaceVibeyChatPanel.tsx`, tests.

## [2026-07-20 14:53] - [FEATURE]

What: Home (and Fathom Meetings) always resolve the personal-account Meetings / Personal Dashboard — same surface inside every org. Added Personal system campaign foundation, rehome migration, prep/enrichment writes that follow the space’s `org_id`, and default Home feed scope `personal`.
Why: Opening Home in an org was binding Agenda prep and related calls to the org Personal Dashboard (or missing personal Meetings entirely). Product rule: Home pulls your personal campaign, not a per-org clone.
Impact: Agenda prep, related recordings, and default My Tasks/feeds use personal-account data while org Campaigns stay org-scoped. Apply migrations `20260720195000_personal_system_campaign.sql` and `20260720200000_rehome_personal_meetings_to_personal_campaign.sql`.
Files: `resolve-meetings-space-id.ts`, `calendar-api.ts`, `home-feed-scope.ts`, `meetings-precall-prep.service.ts`, `integrations-calendar.service.ts`, `fathom-oauth.service.ts`, campaigns Personal ensure/sidebar, migrations, `space-templates.md`, plan.

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

## [2026-07-20 14:41] - [FIX]

What: Fixed mission-side Meta insight requests to retain the active organization context, required Blaze to verify the live Meta connection before declaring data unavailable, and replaced the Ads Research setup form with a one-click Blaze chat intake.

Why: A mounted client account could appear disconnected inside an Ads Research mission because the organization header was lost between the agent API and Meta insights API. The separate research form also duplicated the conversational setup the user wanted Blaze to handle.

Impact: Ads Research now resolves the same organization-scoped Meta connection shown in Paid Ads. Run Research opens Blaze, asks the three intake questions, creates the mission after the answers, and keeps completed research runs below. Missing documents alone can no longer be reported as proof that Meta is disconnected.

Files: Meta agent/API insight path, Ads Research mission playbook, Research Runs UI and messages, focused regression tests, and `documentation/features/social-research.md`.

## [2026-07-20 14:58] - [FEATURE]

What: Replaced the generic mission-first Ads Research run experience with a dedicated visual report that combines saved ad-library cards, source counts, analysis documents, recommendations, copy, and scripts. Added durable many-mission linking to saved ad searches and kept Mission Details as a secondary action.

Why: Research missions were producing visual saved searches and useful documents, but opening a run only exposed the operational mission modal. The visual evidence was stranded in Library Search and the user could not review the complete research story in one place.

Impact: Clicking a research run now opens a full Ads Research report. Users can inspect the actual ad images and videos Blaze researched, open every generated document, and still reach mission status and approvals when needed. New mission searches are linked directly, while older runs recover searches created during their execution window.

Files: Ads Research run detail UI and tests, saved-search API types/service/repository/controller, agent research action and docs, database migration, feature documentation, and changelog.

## [2026-07-20 15:03] - [FEATURE]

What: Added Pixel's database-backed `post-call-delivery` skill, generated the shareable recap once, stored that exact draft in the Slack Shadow ledger, and made ✅ approval claim and deliver the immutable proposal. Added People / Conversations navigation, made agent detail open in Chat, and moved Work into the right-side agent panel.

Why: The meeting loop needed to become one durable capability of the always-aware Slack agent, with visible Shadow review and no template regeneration after approval. People and agent screens also needed consistent conversation-first navigation.

Impact: Post-call recaps can be reviewed in Slack and Team → People → Conversations, approved safely, and delivered exactly as reviewed. The agent UI now prioritizes Chat while preserving Work as contextual detail. The broader Viktor-style progression is documented as phased Shadow-first rollout.

Files: `supabase/migrations/20260720234500_vibey_post_call_delivery_skill.sql`, `docker/agents/vibey/skills/post-call-delivery/SKILL.md`, Task Agent drafting/controller/tests, meeting follow-up confirm/message/tests, Slack People repository/module, People navigation/tests, agent Chat/Work panel files/tests, feature documentation, and follow-up log.

## [2026-07-20 15:10] - [FEATURE]

What: Added the post-call Slack revision loop. The initial DM is explicitly an internal review brief; replies in its thread are processed as feedback, create a replacement client-facing Shadow draft, dismiss the superseded version, and return the updated proposal in-thread. ✅ delivers the latest stored draft.

Why: Internal meeting context and approval guidance should not be confused with the message intended for a client, and reviewers need to iterate naturally in Slack before approving anything.

Impact: A reviewer can now reply with changes such as tone, length, ownership, or removal requests and see the revised client-facing version before approval. Changed drafts cannot inherit approval from the version they replaced.

Files: Slack event routing, meeting follow-up confirm/message service and tests, Pixel post-call skill migration/runtime mirror, feature documentation, and follow-up log.

## [2026-07-20 16:23] - [FIX]

What: Added collapse/reopen controls to the People conversation information panel and consolidated Person Brain management into one bottom section. Once a managed Brain exists, its connected state replaces the create action instead of appearing alongside a stale creation button.

Why: The People detail screen lacked the same right-panel control as agent detail, and successful Person Brain creation rendered two conflicting states at once.

Impact: Admins can give the conversation more room, reopen person context, and immediately see that a Slack-only Person Brain is connected without being prompted to create it again.

Files: `SlackPersonScreen.tsx`, `SlackPersonInfoPanel.tsx`, `SlackPersonBrainControls.tsx`, focused component tests, integration documentation, and changelog.

## [2026-07-20 15:15] - [FEATURE]

What: Index Meta-synced and Studio-created `ad_campaign` / `ad_set` / `ad` rows into Campaign Knowledge (`force: true`), with Space→ad_campaign→ad_set→ad edges (no Space→ad star). Added `scripts/roas/backfill-campaign-ads-knowledge.py` for existing org campaigns.

Why: Campaign Knowledge only had Page Grader memories; agents could not retrieve campaign-attached Meta ads already stored on the campaign.

Impact: Future Meta syncs and ad CRUD write into the knowledge graph; existing Sakha ads backfilled. Structural builder skips Space→ad/ad_set edges to keep the graph hierarchical.

Files: `meta-sync.service.ts`, `meta-sync.repository.ts`, `meta.module.ts`, `space-structural-edge-builder.service.ts`, `artifacts-ads.base.ts`, `artifacts-ad-campaigns.base.ts`, `artifacts-ad-sets.base.ts`, `artifacts-content.base.ts`, tests, backfill script, `page-grader-campaign-brain-sync.md`.

## [2026-07-20 15:45] - [FIX]

What: Widened Google agenda helper `source` union to include `fathom` so Nest build matches `CalendarAgendaEvent`.

Why: Unrelated dirty-tree type error blocked `roas-api` production deploy of ads → Campaign Knowledge.

Impact: `vercel-build` typecheck passes for calendar agenda parse callback.

Files: `integrations-calendar-google-agenda.ts`.

## [2026-07-20 15:47] - [FEATURE]

What: Backfilled Sakha org Campaign Knowledge with 26 ad_campaigns / 62 ad_sets / 450 ads (+ hierarchy edges). Deployed `roas-api` `dpl_GhZXNuBaCAbT8USvRvAdPXtLsPmg` → `api.roas.io`.

Why: Existing Meta rows were never indexed; live Meta sync path needed the new indexer in production.

Impact: Sakha Campaign Knowledge now includes Meta ads; future Meta syncs index ads with `force: true`. Multifamily org had 0 ads (no-op).

Files: `scripts/roas/backfill-campaign-ads-knowledge.py` (prod run), operational deploy.

## [2026-07-20 16:20] - [FIX]

What: Fixed Ads Research startup so a seeded run sends through a fresh Blaze conversation, then has Blaze delegate the restricted mission-creation action to globally reachable Vibey with the exact Space, campaign, playbook, and intake payload. Added an actionable mission-policy recovery contract and capability audit.

Why: The seeded message could create its first conversation under the previously active Vibey agent, while Blaze could collect the intake but could not call `create_mission`. The old prompt also described `playbook_id` as a top-level mission field even though the API accepts it inside `input`.

Impact: Run Research remains visibly led by Blaze. After the three answers, Vibey creates the Ads Research mission internally, Blaze resumes the conversation and links it, and the user is no longer sent to Mission Control to finish the workflow manually.

Files: Space chat seed routing, Ads Research intake/rerun prompts and tests, mission capability policy and RBAC coverage, Missions feature documentation, and Ads Research capability audit.

## [2026-07-20 16:26] - [FIX]

What: Added `org_id` to integrations overview response typing in settings + lib hooks so personal/org mapping typechecks.

Why: `roas-web` production build failed on `useIntegrations.ts` after org-scoped integration mapping landed.

Impact: Unblocks `roas-web` deploy on `7b82ed44`. Redeployed Fly `roas-runtimes` via dockerignore-aware script.

Files: `useIntegrations.ts`, `use-integration-overview.ts`.


## [2026-07-20 16:48] - [FIX]

What: Accept `null` `railIntent` in `resolveSpaceChatSeedSendOptions` so Space chat seed typing matches `GlobalChatRailIntent`.

Why: `roas-web` production TypeScript failed on `SpaceVibeyChatPanel` after Ads Research Blaze intake wiring.

Impact: Unblocks `roas-web` deploy for HEAD Ads Research / Space chat seed flow.

Files: `space-vibey-chat-panel.logic.ts`, test.

## [2026-07-20 17:04] - [FEATURE]

What: Added Pixel's complete Slack channel directory and threaded channel timelines, global Person Brain navigation, and four scheduled Team loops for Person Brain compounding, workflow discovery, unanswered questions, and stalled commitments/client risk. Added Team filtering in Loops plus Shadow/Active mode, people/channel scope, lookback, daily limits, quiet hours, source evidence, run history, and disabled-state kill switches.

Why: Pixel belonged to many Slack channels but only read Slack's first paginated result page, and proactive support existed only as a roadmap. Admins needed one consolidated, reviewable place to observe conversations, grow managed Person Brains, and activate proven behaviors safely.

Impact: Pixel now discovers every channel it belongs to, exposes real channel messages and threads under Team → People → Channels, and can run disabled-by-default proactive loops through the existing Flows engine. Shadow never sends. Active Person Brain writes deduplicate by source and content; unanswered-question delivery additionally requires the target person to be Active and records approved → sending → sent/failed audit state. Workflow and risk findings remain proposals.

Files: Slack pagination/integration tests, Slack People channel APIs and Channels UI, Person Brain global navigation, `observe_slack_team` schemas/runtime/tests, Team Flow templates/filter/controls, shared capability contracts, production template migration, feature documentation, and changelog.

## [2026-07-20 17:17] - [FEATURE]

What: Shipped Pixel Slack Team Loops (four Shadow templates), Channels tab, Person Brains nav, and observe_slack_team automation action.

Why: Team ops needs reviewable Slack observation loops without auto-activation.

Impact: Templates install disabled + delivery_mode=shadow. Channels paginate Slack membership. Person Brains appear in Brain menu. Loops filter includes Team.

Files: slack people/channels, slack-team-loop service, space automation catalog/DTOs, Brain person scope, Flows Team filter, migration `20260721001000_slack_team_loop_templates.sql`.

## [2026-07-20 17:31] - [FEATURE]

What: Added explicit Internal, External, Agent, and Mixed team kinds; created canonical Internal, External, and Agency Agents teams; assigned Vibey, Atlas, Reed, Blaze, Ivy, Lux, and Jaime to Agency Agents; and added external-person membership sourced from classified Slack people.

Why: The global agent directory was being mistaken for actual team membership, so the Team screen could show only three assigned agents even though seven agents existed elsewhere in the organization.

Impact: Team membership now has one durable source of truth. Existing and future organizations receive canonical teams, internal and external membership stays synchronized, agent assignment is restricted to Agent or Mixed teams, and the Team UI displays each membership class separately.

Files: Agent Teams API, repositories, policies, shared web contracts, Team index/detail UI, focused tests, and `20260721010000_team_membership_kinds.sql`.

## [2026-07-20 18:55] - [FIX]

What: Centralized Space calendar provider filtering so Google and Outlook views safely exclude Fathom events in both initial loading and manual reload paths.

Why: The prior production fix widened only one of two duplicated filters, leaving the second filter typed as CalendarProvider-only and blocking the ROAS web deployment during TypeScript validation.

Impact: Removes the production build blocker without changing calendar behavior and prevents the two loading paths from drifting again.

Files: `useSpaceCalendarExternalEvents.ts`, focused regression test.

## [2026-07-20 19:35] - [FIX]

What: Fathom webhook ingest no longer silently drops recordings that arrive without a transcript. Missing transcripts are fetched via the Fathom API when possible; Meetings space automation still runs even if transcript remains empty (brain import / customer routing stay transcript-gated).

Why: Shared team recordings (`shared_team_recordings`) often omit transcript in the webhook body. The early return prevented Meetings call rows — and therefore the Slack follow-up agent loop — from ever starting for teammate-hosted calls.

Impact: Team Fathom webhooks can land in All Meetings without waiting on transcript payload. Requires API deploy. Historical missing calls need a separate backfill if Fathom does not re-deliver.

Files: `fathom-webhook.service.ts`, Fathom controller webhook tests, `spaces-automation.md`, `meeting-follow-up-slack.md`.

## [2026-07-20 20:22] - [FIX]

What: Fixed Page Grader client bootstrap so a newly created campaign is not marked with the incoming content hash before its first deterministic Brain ingest. Changed Campaign Knowledge indexing from a serial record loop to bounded batches of six and added regression coverage for both behaviors.

Why: The active-client preload created campaign shells that immediately reported `skipped_unchanged`, and forced imports with hundreds of knowledge records exceeded the production API request window.

Impact: New active clients perform their first Brain ingest correctly, while large packages index fast enough to complete without unbounded embedding concurrency. Existing partially imported clients can be safely force-synced because memory and evidence writes remain content-hash deduplicated.

Files: `page-grader-client-import.service.ts`, `page-grader-brain-package-ingest.service.ts`, focused service tests, `documentation/features/page-grader-campaign-brain-sync.md`.
