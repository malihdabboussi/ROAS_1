# Changelog - July 23, 2026

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
