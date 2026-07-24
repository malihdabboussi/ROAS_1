# Changelog - July 24, 2026

## [2026-07-24 11:05] - [FIX]

What: Cloned personal Meetings (268 items + Fathom Meeting Log) into ROAS org General; moved CEO HQ + Sales Pipeline into org General; disabled personal Fathom Meeting Log; set Fathom auto-ingest billing to ROAS org. Prefer org Meetings for Home/Agenda/Fathom ensure; rename Programs UI folder Ungrouped → General.

Why: Cross-org personal Meetings injection was buggy and no longer needed; team Fathom should land in the org workspace. Ungrouped campaigns already behave as General.

Impact: ROAS General now has Meetings / CEO HQ / Sales Pipeline. New Fathom webhooks route to org Meetings automation `ef3975a7-…`. Personal Meetings history remains as a disabled-automation archive. UI shows General instead of Ungrouped. Requires api/web deploy for resolution + rename.

Files: `scripts/roas/clone-personal-spaces-to-org.py`, `meetings-precall-prep.service.ts`, `fathom-oauth.service.ts`, `resolve-meetings-space-id.ts`, `integrations-calendar*.ts`, `calendar-api.ts`, Programs Ungrouped→General UI files, `documentation/features/programs.md`, `documentation/features/meeting-follow-up-slack.md`

## 2026-07-24 08:39 - [FEATURE]

What: Added Higgsfield as a native OAuth-connected MCP integration with PKCE, resource-bound authorization, vaulted access/refresh tokens, automatic agent-runtime token refresh, agent-enabled MCP registration, and Settings connect/disconnect UI.

Why: Video-ad missions and Slack agents need durable Higgsfield access without API keys or Composio.

Impact: Admins can connect Higgsfield once from Integrations; ROAS agents can discover and call its MCP tools, and expiring access tokens refresh without interrupting missions.

Files: `apps/api/src/modules/integrations/higgsfield/*`, `apps/agent-api/src/modules/mcp/*`, `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`, `apps/web/src/lib/integrations/integration-catalog.ts`, `packages/api-shared/src/services/mcp-oauth-token-bundle.ts`, `supabase/migrations/20260724223000_higgsfield_mcp_integration.sql`

## 2026-07-24 08:54 - [FEATURE]

What: Applied the Higgsfield catalog migration to ROAS production, configured the production OAuth client/callback/state signer, and deployed the exact connector commit to `api.roas.io`, `app.roas.io`, and `sites.roas.io`.

Why: The connector needs a live callback, catalog row, and Settings card before a user can authorize Higgsfield.

Impact: The Higgsfield card and protected connect/callback routes are live. The Fly agent-runtime deployment remains gated because its established Docker build requires two Git-ignored local runtime inputs.

Files: Supabase `lhfgtsjetcardinpgouq`, Vercel `roas-api` deployment `dpl_62p1osBwt88UQkoaXJjzGvSrQHhk`, Vercel production web/funnels from commit `64553b53`

## 2026-07-24 09:29 - [FIX]

What: Regenerated and committed OpenClaw's A2UI canvas bundle with its matching checksum, then deployed the Higgsfield-enabled agent runtime to Fly.

Why: The clean production image could not build without the generated canvas asset, and the available local asset was stale relative to its source inputs.

Impact: The Fly runtime now includes the verified Higgsfield MCP execution path. Deep health passes with the agent API, OpenClaw gateway, and auth service reachable.

Files: `apps/openclaw/src/canvas-host/a2ui/a2ui.bundle.js`, `apps/openclaw/src/canvas-host/a2ui/.bundle.hash`, Fly app `roas-runtimes`

## 2026-07-24 10:03 - [FIX]

What: Added the missing Automation section to the integrations Library and covered it with a Higgsfield rendering regression test.

Why: Higgsfield was active in the integration catalog but its valid `automation` category was absent from the Library's display order, so the UI silently omitted its card.

Impact: Searching or browsing the integrations Library now shows Higgsfield with an enabled Connect action.

Files: `apps/web/src/features/settings/components/settings-content/IntegrationsLibrary.tsx`, `apps/web/src/features/settings/components/settings-content/IntegrationsLibrary.test.tsx`

## 2026-07-24 09:34 - [FIX]

What: Added a five-second same-model retry before fallback for provider-busy Pixel runs and a specific Slack-facing busy response when every attempt remains unavailable.

Why: A valid Slack follow-up reached Pixel, but the primary and fallback models were both attempted inside the same rate-limit window and the real cause was hidden behind a generic processing error.

Impact: Transient provider throttles can recover without user action. Exhausted attempts remain visibly incomplete, do not receive a success checkmark, and tell the user Pixel is temporarily busy without exposing provider internals.

Files: `apps/agent-api/src/modules/chat/services/chat-stream-execution.service.ts`, `apps/agent-api/src/modules/chat/controllers/channel-chat.controller.ts`, tests, `documentation/features/meeting-follow-up-slack.md`

## [2026-07-24 10:01] - [FIX]

What: Fixed Slack→brain import OpenClaw stream failures cascading into toast spam. SSE failures now surface nested `response.error` (OpenRouter rate limits), stale recovery no longer double-claims live 15m streams, agent-api health recovery no longer wakes rate-limited retries, Slack daily enqueues are staggered, and Home toasts batch identical failures.

Why: ~249 `campaign_slack_import` jobs failed today with generic "OpenClaw stream failed" while the real cause was provider rate limits; a 5-minute stale reclaim plus wake-on-health-recovery burned attempts and flooded the Home notifier.

Impact: Imports back off on rate limits instead of failing opaquely; duplicate toasts collapse; failed jobs were requeued with a staggered schedule starting ~30 minutes out. Deploy of api/queue-worker/web is still required for the code path.

Files: `apps/api/src/modules/missions/services/gateways/mission-agent-gateway.service.ts`, `apps/api/src/modules/canvas/services/canvas-delegation.service.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs-runtime.base.ts`, `apps/api/src/modules/brain/services/brain-import-jobs.types.ts`, `apps/api/src/modules/brain/repositories/brain-import-jobs-runtime.repository.ts`, `apps/queue-worker/src/modules/slack-sync/services/slack-sync.service.ts`, `apps/web/src/features/brain/components/BrainImportJobNotifier.tsx`

## [2026-07-24 10:42] - [FIX]

What: Pushed and deployed `6b904ad1` (OpenClaw Slack import rate-limit hardening + Programs sidebar WIP) to production.

Why: Home toast storms needed the API/queue-worker/web fix live, and local WIP was ready to ship.

Impact: `origin/main` = `6b904ad1`. Vercel `roas-api` / `roas-web` / `roas-funnels` READY; Railway `queue-worker` Online; smoke 4/4.

Files: production deploy of commit `6b904ad1`

## [2026-07-24 12:06] - [FEATURE]

What: Shipped Program-level permissions MVP (visibility workspace/private/selected, created_by, program_shares, has_program_access; Nest ProgramPermissionsService; campaign/space/All Tasks inherit; org ShareModal + sidebar Share/lock).

Why: Programs were org-wide with no ACL; Private/Selected needed a Program boundary that inherits into campaigns and spaces.

Impact: Default workspace behavior unchanged. Restricted Programs hide from non-ACL members in sidebar, hub, All Tasks, and campaign/space APIs. Agents inherit invoking-user access via RLS.

Files: `supabase/migrations/20260724190155_program_permissions.sql`, `apps/api/src/modules/programs/*`, `apps/api/src/modules/campaigns/*`, `apps/api/src/modules/spaces/services/space-permissions*`, `apps/web/src/lib/org/org-resource-sharing.ts`, `apps/web/src/components/org/ShareModal*`, `apps/web/src/components/layout/sidebar/SidebarProgram*`, `documentation/features/programs.md`

## [2026-07-24 12:21] - [FEATURE]

What: Applied `program_permissions` migration on ROAS prod and archive-deployed Program ACL MVP to production aliases.

Why: Ship Program visibility/shares with inherit gates live on api.roas.io / app.roas.io without git push.

Impact: Migration on `lhfgtsjetcardinpgouq` (4 Programs default workspace). `roas-api` `dpl_Ax3TfvkFZQeGeTLqeXg4TKeh3ExL` → api.roas.io; `roas-web` `dpl_8uXenuiokK4k1Zh9XRom3KiGFusW` → app.roas.io. Smoke 4/4. `/api/programs` returns 401 (route present).

Files: production deploy of branch `feat/program-level-permissions` working tree

## [2026-07-24 11:14] - [FIX]

What: Hydrated abbreviated inbound Slack file events through `files.info` before download, added forwarded-message unfurl parsing, and loaded recent context from a forwarded message's source channel when Pixel has access.

Why: Pixel silently discarded screenshots whose event contained only a Slack file id and treated forwarded channel messages as ordinary links, so it claimed it could not see either the attachment or the referenced conversation.

Impact: Forwarded Slack messages now carry their author, channel, content, links, and readable source-channel discussion into Pixel. Attached screenshots and documents reach the agent even when Slack omits their private download URL from the initial event.

Files: `apps/api/src/modules/slack/types/slack.types.ts`, `apps/api/src/modules/slack/services/slack-forwarded-message-context.ts`, `apps/api/src/modules/slack/services/slack-service-conversation.base.ts`, `apps/api/src/modules/slack/services/slack-service-events.base.ts`, `apps/api/src/modules/slack/services/slack-service-media.base.ts`, Slack regression tests, `documentation/features/integration-connections.md`

## [2026-07-24 11:23] - [FEATURE]
What: Archive-deployed Personal→org Meetings + General UI rename + org Meetings resolution / Fathom routing prefs to production (API + web). Protected aliases from competing CLI/git promotes.
Why: DB clone already live; ship code so Home/Agenda/ensureMeetingsSpace prefer org Meetings and UI shows General instead of Ungrouped, without wiping Programs/Team Agenda via a stale git deploy.
Impact: `api.roas.io` → `dpl_4zoos5ePGPQkARdPcta1zBmqnSzY` READY; `app.roas.io` → `dpl_8tg2Lo34LbqFMay1iAWiFvRd1De6` READY. Smoke: `/api/programs` 401, Team Agenda `scope=team` 401, `app.roas.io/login` 200. No origin push.
Files: local branch `fix/personal-to-org-meetings-spaces` working tree; Vercel `roas-api` / `roas-web`
