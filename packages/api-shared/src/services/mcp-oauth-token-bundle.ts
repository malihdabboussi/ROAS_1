export const MCP_OAUTH_TOKEN_BUNDLE_VERSION = 1 as const

export type McpOAuthTokenBundle = {
  version: typeof MCP_OAUTH_TOKEN_BUNDLE_VERSION
  provider: string
  accessToken: string
  refreshToken: string | null
  expiresAt: string | null
  clientId: string
  tokenEndpoint: string
  resource: string
  scope: string | null
}

export function parseMcpOAuthTokenBundle(value: string): McpOAuthTokenBundle | null {
  try {
    const parsed = JSON.parse(value) as Partial<McpOAuthTokenBundle>
    if (
      parsed.version !== MCP_OAUTH_TOKEN_BUNDLE_VERSION ||
      typeof parsed.provider !== 'string' ||
      typeof parsed.accessToken !== 'string' ||
      typeof parsed.clientId !== 'string' ||
      typeof parsed.tokenEndpoint !== 'string' ||
      typeof parsed.resource !== 'string'
    ) {
      return null
    }
    return {
      version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
      provider: parsed.provider,
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt: typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null,
      clientId: parsed.clientId,
      tokenEndpoint: parsed.tokenEndpoint,
      resource: parsed.resource,
      scope: typeof parsed.scope === 'string' ? parsed.scope : null,
    }
  } catch {
    return null
  }
}

export function serializeMcpOAuthTokenBundle(bundle: McpOAuthTokenBundle): string {
  return JSON.stringify(bundle)
}

export function mcpOAuthTokenNeedsRefresh(
  bundle: McpOAuthTokenBundle,
  now = Date.now(),
  refreshBufferMs = 60_000,
): boolean {
  if (!bundle.expiresAt) return false
  const expiresAt = Date.parse(bundle.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt <= now + refreshBufferMs
}
