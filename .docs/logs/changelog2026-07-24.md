# Changelog - July 24, 2026

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
