import { Injectable } from '@nestjs/common'
import {
  mcpOAuthTokenNeedsRefresh,
  parseMcpOAuthTokenBundle,
  serializeMcpOAuthTokenBundle,
  SupabaseServiceClient,
  type McpOAuthTokenBundle,
} from '@vibey/api-shared'
import { McpRepository } from '../repositories/mcp.repository'

type RefreshResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

@Injectable()
export class McpOAuthTokenService {
  constructor(
    private readonly repository: McpRepository,
    private readonly serviceClient: SupabaseServiceClient,
  ) {}

  async resolve(vaultSecretId: string, rawValue: string): Promise<string> {
    const bundle = parseMcpOAuthTokenBundle(rawValue)
    if (!bundle) return rawValue
    if (!mcpOAuthTokenNeedsRefresh(bundle)) return bundle.accessToken
    if (!bundle.refreshToken) {
      await this.markNeedsReconnect(vaultSecretId, bundle.provider)
      throw this.reconnectError(bundle.provider)
    }

    const refreshed = await this.refresh(bundle).catch(() => null)
    if (!refreshed?.access_token) {
      await this.markNeedsReconnect(vaultSecretId, bundle.provider)
      throw this.reconnectError(bundle.provider)
    }

    const next: McpOAuthTokenBundle = {
      ...bundle,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? bundle.refreshToken,
      expiresAt:
        typeof refreshed.expires_in === 'number'
          ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
          : bundle.expiresAt,
      scope: refreshed.scope ?? bundle.scope,
    }
    await this.repository.updateAuthToken(
      this.serviceClient.client,
      vaultSecretId,
      serializeMcpOAuthTokenBundle(next),
    )
    return next.accessToken
  }

  private async refresh(bundle: McpOAuthTokenBundle): Promise<RefreshResponse> {
    const endpoint = new URL(bundle.tokenEndpoint)
    if (endpoint.protocol !== 'https:') throw new Error('OAuth token endpoint must use HTTPS')
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: bundle.refreshToken ?? '',
        client_id: bundle.clientId,
        resource: bundle.resource,
      }),
    })
    if (!response.ok) throw new Error('OAuth refresh rejected')
    return (await response.json()) as RefreshResponse
  }

  private reconnectError(provider: string): Error {
    const name = provider === 'higgsfield' ? 'Higgsfield' : 'This MCP connection'
    return new Error(`${name} needs to be reconnected in Settings → Integrations.`)
  }

  private async markNeedsReconnect(vaultSecretId: string, provider: string): Promise<void> {
    await this.repository
      .markOAuthNeedsReconnect(this.serviceClient.client, vaultSecretId, provider)
      .catch(() => undefined)
  }
}
