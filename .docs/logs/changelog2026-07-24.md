# Changelog - July 24, 2026

## 2026-07-24 08:39 - [FEATURE]

What: Added Higgsfield as a native OAuth-connected MCP integration with PKCE, resource-bound authorization, vaulted access/refresh tokens, automatic agent-runtime token refresh, agent-enabled MCP registration, and Settings connect/disconnect UI.

Why: Video-ad missions and Slack agents need durable Higgsfield access without API keys or Composio.

Impact: Admins can connect Higgsfield once from Integrations; ROAS agents can discover and call its MCP tools, and expiring access tokens refresh without interrupting missions.

Files: `apps/api/src/modules/integrations/higgsfield/*`, `apps/agent-api/src/modules/mcp/*`, `apps/web/src/features/settings/components/settings-content/useIntegrations.ts`, `apps/web/src/lib/integrations/integration-catalog.ts`, `packages/api-shared/src/services/mcp-oauth-token-bundle.ts`, `supabase/migrations/20260724223000_higgsfield_mcp_integration.sql`
