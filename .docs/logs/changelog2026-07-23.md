# Changelog - July 23, 2026

## [2026-07-23 17:08] - [FIX]

What: Kept channel-chat SSE responses alive after the incoming HTTP request body closes by tracking the outgoing response lifecycle instead. Added a regression test that closes the request before the agent emits content.

Why: Slack events reached Pixel and the shared runtime returned HTTP 200, but the controller marked the client disconnected before generation completed, suppressing every response chunk and leaving Slack with no reply.

Impact: Pixel can stream completed agent responses back through Slack instead of acknowledging messages with an eye reaction and then silently returning an empty response. Commit `84112536` was pushed to `main` and deployed to the `roas-runtimes` Fly app; deep readiness passed with the gateway and auth dependencies reachable.

Files: `apps/agent-api/src/modules/chat/controllers/channel-chat.controller.ts`, `apps/agent-api/src/modules/chat/controllers/__tests__/channel-chat.controller.telegram.test.ts`

## [2026-07-23 16:48] - [FIX]

What: `getCampaign` / `upsertUserState` now fall back to personal (`org_id` null) when an org-scoped lookup misses — same pattern as update/delete. Added regression tests.

Why: Programs sidebar merges the Personal campaign into org lists, but GET `/api/campaigns/:id` with `x-org-id` filtered `org_id = <org>` and returned 404.

Impact: Clicking Personal (and other personal-scoped campaigns) from the org Programs tree opens successfully. Archive-deployed `roas-api` `dpl_56sir1jbimhRspixa61z5f3EzH6P` → api.roas.io. Verified GET Personal with `x-org-id` → 200; `/api/programs` and rollup still present. Web unchanged (API-only). No origin push.

Files: `campaigns-service-01.base.ts`, `campaigns.service.test.ts`, Vercel Production `roas-api`

## [2026-07-23 14:25] - [FIX]

What: Included tracked pnpm dependency patches in Vercel source uploads while continuing to exclude the unrelated root-level team invite patch.

Why: Production web and funnels deployments failed during installation because `.vercelignore` removed the patch files referenced by the workspace lockfile.

Impact: Vercel can install the monorepo dependencies and proceed to the application builds from the consolidated main release.

Files: `.vercelignore`

## [2026-07-23 14:00] - [FEATURE]

What: Programs sidebar v2 — ClickUp Spaces UX. Nav label Campaigns→Programs; fixed 280px panel; programs-first load with skeleton (no flat All Spaces flash); folders collapsed by default; icon→chevron on hover (click expands, name navigates); header + create menu (New Program / Campaign / Space); row hover ⋯/+; All Tasks at top; footer + New Program; NewProgramModal + program context menu.

Why: Match ClickUp Spaces hierarchy and interaction so Programs feel like a real workspace tree, not a growing flyout of flat campaigns.

Impact: Hard-refresh app.roas.io → Programs panel shows collapsed Clients/ROAS Ops/Ungrouped, All Tasks, create menu, truncate. Archive-deployed `roas-web` `dpl_7PtVk64bjo189n88WQ2XiXn9GLLP` → app.roas.io. API not redeployed; live `/api/programs`, rollup, and agenda `scope=team` return 401 (routes present). No origin push.

Files: `SidebarProgramFolder.tsx`, `SidebarHqSpacesBucketList.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqSpacesRows.tsx`, `SidebarHqFlyouts.tsx`, `SidebarHqHubMenuDockFlyouts.tsx`, `HubDockFlyout.tsx`, `manage-rail-items.tsx`, `NewProgramModal.tsx`, `SidebarProgramsCreateMenu.tsx`, `SidebarProgramMenuPortal.tsx`, `globals.css`, `documentation/features/programs.md`, Vercel `roas-web`

## [2026-07-23 13:53] - [FIX]

What: Consolidated the remaining local Programs, Slack image, and Paid Ads work for a single local-main release. Paid Ads campaign selection now treats each line as one campaign so commas inside campaign names or dates are preserved. Removed a duplicated sidebar controller test property found during reconciliation.

Why: The production release must include every intentional in-progress feature without mixing in generated OpenClaw runtime state or splitting valid campaign names on commas.

Impact: Programs navigation, Slack image processing, and Paid Ads audit inputs can ship together from one conflict-checked source state. Generated OpenClaw runtime files remain preserved separately and are not committed as application source.

Files: `apps/web/src/features/spaces/components/StartPlaybookModal.tsx`, `apps/web/src/features/spaces/components/playbooks/meta-ads-audit.ts`, Programs sidebar and overview files, Slack media files, `.vercelignore`

## [2026-07-23 13:15] - [FEATURE]

What: ClickUp-style Programs sidebar tree — expandable Program folders (Clients / ROAS Ops) in the Campaigns rail flyout and hub menu; Program name → `/programs/[id]` overview; campaign chevron expands spaces inline. Persist expand state. Removed nested spaces hover flyout. Favourite campaigns stay pinned at top. Archive-deployed `roas-web` `dpl_43d84MQ2VAtaeuzY1ov8Gktxruwe` → app.roas.io. Re-aliased `api.roas.io` to Programs-capable `dpl_9v7g4yxi4yhDXswGfpikAYxEzA1P` after a competing CLI build left the alias on DEPLOYMENT_NOT_FOUND; canceled that API build. No origin push; no API code redeploy.

Why: Users expected Program as a real sidebar folder (navigate + expand), not only section labels in a hover list.

Impact: Hard-refresh app.roas.io → Campaigns → expand Clients/ROAS Ops → expand a campaign → open a space. Click Clients opens program overview. Team Agenda preserved on api.roas.io.

Files: `SidebarProgramFolder.tsx`, `SidebarHqSpacesBucketList.tsx`, `SidebarHqSpacesGroupedList.tsx`, `SidebarHqSpacesRows.tsx`, `sidebar-expand-persistence.ts`, `useSidebarController.ts`, `programs/[id]/page.tsx`, `CampaignsHub.tsx`, `documentation/features/programs.md`, Vercel `roas-web` / `roas-api` aliases

## [2026-07-23 11:46] - [FIX]

What: Restored Programs on production after a Slack CLI deploy stole `api.roas.io` (live `/api/programs` was 404 → sidebar flyout silently rendered a flat campaign list). Re-aliased then archive-deployed local main API (`dpl_4rAPGuaBZB6X5MVEgrEK6PcaU9R4`) + web (`dpl_A8BqcjQoDJuJYdGhm6iuCR2Q4wKm`) with flyout program headers using `hub-menu-section-label`. Canceled competing git promotes. No origin push.

Why: Sidebar Campaigns flyout already grouped by program in code, but fetchPrograms failed on 404 and `programs=[]` hid all Clients / ROAS Ops headers.

Impact: Hard-refresh app.roas.io → hover Campaigns → see CLIENTS / ROAS OPS section labels. `/campaigns` hub and `/all-tasks` remain. Team Agenda preserved (team≠personal).

Files: `SidebarHqSpacesBucketList.tsx`, Vercel Production `roas-api` / `roas-web`

## [2026-07-23 11:18] - [FEATURE]

What: Replaced the Ads Research metric and summary-card stack with one linked narrative summary, added a compact circular production handoff, and introduced a dedicated Production mode between Research and Launch.

Why: Research evidence, production decisions, and campaign launching were competing in one report. The workflow needed a readable research conclusion and a distinct place to approve concepts and track recording, design, and build progress.

Impact: Blaze's outputs now open directly from the summary paragraph. Starting production preserves the source research mission, opens the new Production workspace, and continues through the existing persisted approval and Meta Ads Launch handoff.

Files: `apps/web/src/features/spaces/components/ads-research/*`, `apps/web/src/features/spaces/components/artifacts/paid-ads/PaidAdsSpaceView.tsx`, `apps/web/src/features/spaces/views/artifacts/*`, `apps/web/src/features/spaces/types/space-schema.ts`, `documentation/features/social-research.md`

## [2026-07-23 13:02] - [FEATURE]

What: Added fail-closed Slack Pixel authorization driven by Manage People, including Slack Connect classification, all-human channel checks, owner-funded internal execution, owner-only Personal Brain access, and short denial or temporary-verification replies.

Why: Slack identities without platform accounts need useful ROAS access, but clients, unknown users, mixed channels, and internal teammates requesting the owner's private memory must never inherit the Slack connection owner's full identity.

Impact: Internal people can use organization capabilities and credits without portal accounts. External, Ignored, unresolved, and unsafe-channel requests stop before file processing or agent execution. Non-owner Slack principals lose Personal Brain prompt access and are denied across direct, broad-search, Atlas, Brain Scholar, and transfer tool routes.

Files: `apps/api/src/modules/slack/*`, `apps/agent-api/src/modules/chat/*`, `apps/agent-api/src/modules/artifacts/services/artifact-access-policy-actions.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-channel-principal.policy.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-runtime-core.service.ts`, `apps/web/src/features/team-2/config/messages.config.ts`, `documentation/features/integration-connections.md`

## [2026-07-23 12:32] - [FIX]

What: Integrated Pixel delegation, Page Grader MCP routing, Slack signal resolution, persistent people classifications, and Pixel-neutral Slack failures onto local main. Added a corrective production migration for James Anderson and Nefi Blanco because their Slack display names include role suffixes.

Why: Natural funnel work must route to Page Grader without requiring the product name, human and AI delegation need distinct execution paths, and exact-name classification repair did not match the stored Slack display names.

Impact: Pixel can route funnel fulfillment through Page Grader after resolving the client/campaign, human targets become assigned tasks, managed agents use delegation tools, and James/Nefi remain internal after Slack refreshes.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/*/skills/page-grader-operator/SKILL.md`, `apps/api/src/modules/slack/*`, `supabase/migrations/20260723124500_page_grader_delegation_routing_skill.sql`, `supabase/migrations/20260723143000_preserve_slack_people_classifications.sql`, `supabase/migrations/20260723143100_slack_signal_operator_routing_skill.sql`, `supabase/migrations/20260723143200_correct_internal_slack_people.sql`

## [2026-07-23 13:01] - [FIX]

What: Safely synchronized the existing ROAS organization owner's public profile email to `dylan@dylanvanas.com` without changing the owner's auth identity, organization membership, or role. Deployed the Pixel/Page Grader API changes to `api.roas.io` and the Pixel agent runtime to `roas-runtimes`, and pinned the OpenClaw image build to its declared pnpm version.

Why: The owner auth account already used the correct email while the matching public profile still contained the old test email. Pixel's delegation behavior also spans both the main API and the Fly agent runtime, so both services needed the same release.

Impact: The ROAS owner remains the same active owner user, now with a consistent profile email. Pixel's human, managed-agent, and Page Grader delegation routing is live across the production API and runtime.

Files: `supabase/migrations/20260723143500_sync_roas_owner_profile_email.sql`, `docker/Dockerfile`, Vercel Production `roas-api`, Fly Production `roas-runtimes`

## [2026-07-23 13:24] - [FIX]

What: Repaired inbound Slack image processing by allowing the intentional `image_upload` conversation document type and replacing an unusable public URL for the private `campaigns` bucket with a one-year signed URL.

Why: A Slack image turn failed twice: production rejected the attachment row through `conversation_documents_document_type_check`, then the model gateway could not fetch the private storage object through the generated public URL.

Impact: Pixel can persist Slack image context and give the model a fetchable image URL instead of returning the generic “couldn't process this message” failure.

Files: `slack-runtime.repository.ts`, `slack-service-media.base.ts`, `slack-media.test.ts`, `supabase/migrations/20260723144500_allow_conversation_image_uploads.sql`
## [2026-07-23 14:42] - [FIX]

What: Corrected Pixel's Page Grader delegation contract so funnel, landing-page, and campaign-page work remains Page Grader fulfillment when the user names a human owner. The named person is now routed through Page Grader's assignee field, and Pixel is explicitly prohibited from using ambient campaign-team or managed-agent lookup as a substitute.

Why: The live request to have Rafay build an Asura Group funnel loaded the correct skill but followed the older named-human rule, searched the current ROAS campaign team, and never created a Page Grader fulfillment request.

Impact: Requests such as “Have Rafay build this funnel for Asura Group” resolve the named client and assignee through Page Grader, call the typed fulfillment tool, preserve the reference and brief, and only report success after Page Grader confirms the durable work record.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `apps/agent-api/src/modules/agent-sync/services/page-grader-human-fulfillment-routing.test.ts`, `supabase/migrations/20260723150500_fix_page_grader_human_fulfillment_routing.sql`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-07-23 15:11] - [FIX]

What: Upgraded Pixel's always-loaded global delegation policy and Page Grader skill so bare names default to humans, named clients override ambient campaign context, and client context is resolved across the client's own campaign Brain, Page Grader records, and accessible Slack channel evidence.

Why: A fresh Slack request for Rafay to build an Asura Group funnel still searched only the currently attached Multifamily Strategy campaign, never called Page Grader, and asked for information already available in Asura Group's campaign Brain, Page Grader account, and Slack channel.

Impact: Pixel no longer pre-gates human owners through the ambient campaign team, substitutes an AI agent, or treats an unrelated campaign as the only Brain. Funnel requests now stay on the Page Grader fulfillment path and ask for clarification only after named-client sources are exhausted.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `packages/agent-policy/src/index.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `apps/agent-api/src/modules/agent-sync/services/pixel-named-client-delegation.test.ts`, `supabase/migrations/20260723153000_fix_pixel_named_client_delegation.sql`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-07-23 15:28] - [FIX]

What: Separated read-only named-campaign resolution from the operation that attaches a conversation to a campaign, then routed explicit cross-client Brain searches through the read-only resolver.

Why: Looking up one named client from Slack silently changed the conversation's active campaign. Later requests inherited that client and Pixel incorrectly claimed it was locked to the wrong Brain.

Impact: Pixel can resolve any accessible named client across the organization without contaminating the Slack thread's campaign context. Exact and unique partial matches work generically; ambiguous or missing clients produce focused resolution errors instead of a guessed match.

Files: `apps/agent-api/src/modules/artifacts/services/artifact-campaign-name-resolver.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-legacy-session-campaign.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-actions.service.ts`, `apps/agent-api/src/modules/artifacts/services/artifact-brain-search-campaign-brain.test.ts`, `apps/agent-api/src/modules/artifacts/services/artifacts.service.ts`, `apps/agent-api/src/modules/artifacts/legacy/artifacts-legacy.service.ts`, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-23 15:56] - [FIX]

What: Changed Pixel's always-loaded delegation policy and fulfillment skill so tool execution stays private, progress uses structured labels, and Slack receives one concise confirmed result or one plain-language blocker. Generated replies and the fixed post-call footer now call Page Grader the ROAS portal and the AI platform the ROAS platform.

Why: A multi-tool funnel request streamed Page Grader, MCP, schema, idempotency, routing, and retry narration into Slack as a run-on response.

Impact: Pixel can still use the same internal tools and safety controls, but users see the business outcome, owner, client or campaign, and next step instead of implementation mechanics.

Files: `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `apps/agent-api/src/modules/agent-sync/services/pixel-user-facing-tool-language.test.ts`, `apps/api/src/modules/spaces/services/meeting-follow-up-slack-message.ts`, `apps/api/src/modules/spaces/services/__tests__/meeting-follow-up-slack-message-language.test.ts`, `supabase/migrations/20260723160000_hide_pixel_tool_execution_language.sql`, `documentation/features/page-grader-mcp-bridge.md`

## [2026-07-23 16:06] - [FIX]

What: Added Slack-safe row formatting to Pixel's global instructions and final outbound formatter. Markdown tables are now converted into compact labeled bullets while fenced code remains unchanged.

Why: Slack displayed valid Markdown table pipes and separator rows as raw text, making campaign metrics difficult to scan.

Impact: Pixel's Slack reports remain readable even when a model emits a Markdown table. Portal documents can continue using real Markdown tables.

Files: `apps/api/src/modules/slack/services/slack-markdown-to-mrkdwn.ts`, `apps/api/src/modules/slack/services/__tests__/slack-markdown-to-mrkdwn.test.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `supabase/migrations/20260723161000_slack_safe_table_formatting.sql`, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-23 16:44] - [FIX]

What: Added canonical channel identity to Pixel's Slack channel-history result, made explicit channel mentions authoritative during client resolution, and made ROAS portal funnel fulfillment fail closed instead of silently creating a generic task or native funnel.

Why: Pixel read the explicitly tagged Whole Universe channel but inferred 1DS Collective from message content, returned the wrong client's Meta data, and changed a failed Asura Group fulfillment request into a different kind of work.

Impact: Pixel can verify a tagged channel's real ID/name before campaign, Brain, or reporting lookup. “The portal” remains the ROAS portal fulfillment path unless the user explicitly requests native funnel generation, and a fulfillment failure cannot substitute another work type, owner, or client.

Files: `apps/api/src/modules/slack/services/slack-agent-tools.service.ts`, `apps/api/src/modules/slack/services/slack-agent-tools.service.test.ts`, `apps/api/src/modules/composio/services/slack-legacy-capabilities.partial.ts`, `packages/agent-policy/src/platform-tools-template.ts`, `packages/agent-policy/src/platform-tools-template.test.ts`, `docker/agents/vibey/skills/page-grader-operator/SKILL.md`, `docker/agents/atlas/skills/page-grader-operator/SKILL.md`, `apps/agent-api/src/modules/agent-sync/services/pixel-named-client-delegation.test.ts`, `supabase/migrations/20260723163000_fix_pixel_slack_channel_identity_routing.sql`, `documentation/features/meeting-follow-up-slack.md`, `.docs/plans/pixel-slack-funnel-capability-drift-2026-07-23.md`

## [2026-07-23 20:42] - [FIX]

What: Consolidated All Tasks inside the Programs flyout, upgraded primary sidebar flyouts to a wider near-full-height top-aligned layout, replaced the blank Programs load with stable row skeletons, automatically paginated the complete spaces tree, scoped campaign/program state to the active organization, and preserved Personal campaign access while an organization is selected.

Why: The main sidebar duplicated All Tasks, Programs briefly rendered white, older Personal/calendar/client spaces stayed hidden behind manual pagination, organization switches could reuse stale campaign data, and opening the Personal campaign from an organization could return “Campaign not found.”

Impact: Programs now behaves like a consistent ClickUp-style workspace panel, shows the complete campaign/space hierarchy without manual loading, and follows workspace changes without leaking stale rows or breaking Personal navigation.

Files: `apps/web/src/components/layout/sidebar/*`, `apps/web/src/app/globals.css`, `apps/website/src/app/globals.css`, `apps/api/src/modules/campaigns/services/campaigns-service-01.base.ts`, `apps/api/src/modules/campaigns/services/__tests__/campaigns.service.test.ts`, `documentation/features/programs.md`

## [2026-07-23 20:42] - [FEATURE]

What: Added an IG organic Story video production launcher and reusable mission skill. Users can select one or many scenes, reuse eight clean preset clips, generate fresh Higgsfield variants, run a separate copy approval stage, choose from five approved Apple-style emojis, and preserve the source Ads Research handoff.

Why: Organic-looking caption videos needed one production contract for the Paid Ads UI and agent chat, with deterministic Pillow text and preset reuse so repeated ads do not spend unnecessary generation credits.

Impact: Lux and Vibey can run the same `ig-organic-video-ad` playbook from Production or conversational channels. Higgsfield is treated as a direct MCP connection, copy is approved before rendering, and selected scene count determines the number of video outputs.

Files: `apps/web/src/features/spaces/components/ads-research/IgOrganicVideoProductionLauncher.tsx`, `apps/web/src/features/spaces/components/ads-research/AdsResearchProductionView.tsx`, `apps/web/src/features/spaces/components/playbooks/ig-organic-video.ts`, `apps/web/src/features/spaces/config/ig-organic-video-scenes.config.ts`, `apps/api/src/modules/missions/services/webinar-fulfillment-team.service.ts`, `apps/agent-api/src/modules/agent-sync/services/ig-organic-video-ad-skill-contract.test.ts`, `supabase/migrations/20260723204214_ig_organic_video_ad_skill.sql`, `documentation/features/social-research.md`

## [2026-07-23 20:54] - [FIX]

What: Fixed Pixel's Slack completion lifecycle so code-only Agent API errors such as `no_answer` cannot be mistaken for a successful empty response. Pixel now keeps 👀 while working, adds ✅ only after Slack accepts the reply, and posts the standard retry message without ✅ when generation or delivery fails.

Why: The prior stream-close repair kept the response stream alive but did not handle structured error events that omitted a message. Those events returned an empty answer, removed 👀, and left the user with no reply or visible failure.

Impact: A Slack request can no longer silently lose its processing indicator. Successful requests visibly complete with ✅; unsuccessful requests remain visibly incomplete and receive a retry response.

Files: `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, `apps/api/src/modules/slack/integrations/slack-api-integration-core.base.ts`, `apps/api/src/modules/slack/services/__tests__/slack-service-events.test.ts`, `apps/api/src/modules/slack/integrations/slack-api.integration.test.ts`, `documentation/features/meeting-follow-up-slack.md`
