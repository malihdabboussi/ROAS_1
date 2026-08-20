"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const mcp_oauth_token_bundle_1 = require("./mcp-oauth-token-bundle");
(0, vitest_1.describe)('MCP OAuth token bundle', () => {
    (0, vitest_1.it)('round-trips the durable OAuth credential contract', () => {
        const raw = (0, mcp_oauth_token_bundle_1.serializeMcpOAuthTokenBundle)({
            version: mcp_oauth_token_bundle_1.MCP_OAUTH_TOKEN_BUNDLE_VERSION,
            provider: 'higgsfield',
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            expiresAt: '2026-07-24T22:00:00.000Z',
            clientId: 'client-1',
            tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
            resource: 'https://mcp.higgsfield.ai/mcp',
            scope: 'openid email offline_access',
        });
        (0, vitest_1.expect)((0, mcp_oauth_token_bundle_1.parseMcpOAuthTokenBundle)(raw)).toMatchObject({
            provider: 'higgsfield',
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
        });
    });
    (0, vitest_1.it)('does not mistake existing static MCP API keys for OAuth bundles', () => {
        (0, vitest_1.expect)((0, mcp_oauth_token_bundle_1.parseMcpOAuthTokenBundle)('plain-api-key')).toBeNull();
    });
    (0, vitest_1.it)('refreshes before expiry', () => {
        const bundle = (0, mcp_oauth_token_bundle_1.parseMcpOAuthTokenBundle)((0, mcp_oauth_token_bundle_1.serializeMcpOAuthTokenBundle)({
            version: mcp_oauth_token_bundle_1.MCP_OAUTH_TOKEN_BUNDLE_VERSION,
            provider: 'higgsfield',
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            expiresAt: '2026-07-24T22:01:00.000Z',
            clientId: 'client-1',
            tokenEndpoint: 'https://mcp.higgsfield.ai/oauth2/token',
            resource: 'https://mcp.higgsfield.ai/mcp',
            scope: null,
        }));
        (0, vitest_1.expect)((0, mcp_oauth_token_bundle_1.mcpOAuthTokenNeedsRefresh)(bundle, Date.parse('2026-07-24T22:00:30.000Z'))).toBe(true);
    });
});
//# sourceMappingURL=mcp-oauth-token-bundle.test.js.map