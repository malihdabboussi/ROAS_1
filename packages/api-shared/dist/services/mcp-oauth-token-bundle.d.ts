export declare const MCP_OAUTH_TOKEN_BUNDLE_VERSION: 1;
export type McpOAuthTokenBundle = {
    version: typeof MCP_OAUTH_TOKEN_BUNDLE_VERSION;
    provider: string;
    accessToken: string;
    refreshToken: string | null;
    expiresAt: string | null;
    clientId: string;
    tokenEndpoint: string;
    resource: string;
    scope: string | null;
};
export declare function parseMcpOAuthTokenBundle(value: string): McpOAuthTokenBundle | null;
export declare function serializeMcpOAuthTokenBundle(bundle: McpOAuthTokenBundle): string;
export declare function mcpOAuthTokenNeedsRefresh(bundle: McpOAuthTokenBundle, now?: number, refreshBufferMs?: number): boolean;
