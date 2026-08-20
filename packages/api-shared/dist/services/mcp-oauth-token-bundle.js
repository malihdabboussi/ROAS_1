"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP_OAUTH_TOKEN_BUNDLE_VERSION = void 0;
exports.parseMcpOAuthTokenBundle = parseMcpOAuthTokenBundle;
exports.serializeMcpOAuthTokenBundle = serializeMcpOAuthTokenBundle;
exports.mcpOAuthTokenNeedsRefresh = mcpOAuthTokenNeedsRefresh;
exports.MCP_OAUTH_TOKEN_BUNDLE_VERSION = 1;
function parseMcpOAuthTokenBundle(value) {
    try {
        const parsed = JSON.parse(value);
        if (parsed.version !== exports.MCP_OAUTH_TOKEN_BUNDLE_VERSION ||
            typeof parsed.provider !== 'string' ||
            typeof parsed.accessToken !== 'string' ||
            typeof parsed.clientId !== 'string' ||
            typeof parsed.tokenEndpoint !== 'string' ||
            typeof parsed.resource !== 'string') {
            return null;
        }
        return {
            version: exports.MCP_OAUTH_TOKEN_BUNDLE_VERSION,
            provider: parsed.provider,
            accessToken: parsed.accessToken,
            refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
            expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
            clientId: parsed.clientId,
            tokenEndpoint: parsed.tokenEndpoint,
            resource: parsed.resource,
            scope: typeof parsed.scope === 'string' ? parsed.scope : null,
        };
    }
    catch {
        return null;
    }
}
function serializeMcpOAuthTokenBundle(bundle) {
    return JSON.stringify(bundle);
}
function mcpOAuthTokenNeedsRefresh(bundle, now = Date.now(), refreshBufferMs = 60_000) {
    if (!bundle.expiresAt)
        return false;
    const expiresAt = Date.parse(bundle.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= now + refreshBufferMs;
}
//# sourceMappingURL=mcp-oauth-token-bundle.js.map