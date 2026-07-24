import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  MCP_OAUTH_TOKEN_BUNDLE_VERSION,
  serializeMcpOAuthTokenBundle,
  SupabaseServiceClient,
  type RequestScope,
} from '@vibey/api-shared'
import { resolveAppUrl, resolvePlatformApiUrl } from '../../../lib/platform-defaults'
import { McpProbeService } from '../../mcp/services/mcp-probe.service'
import { IntegrationConnectionsRepository } from '../repositories/integration-connections.repository'
import { HiggsfieldRepository } from './higgsfield.repository'

const INTEGRATION_ID = 'higgsfield'
const RESOURCE = 'https://mcp.higgsfield.ai/mcp'
const AUTHORIZATION_ENDPOINT = 'https://mcp.higgsfield.ai/oauth2/authorize'
const TOKEN_ENDPOINT = 'https://mcp.higgsfield.ai/oauth2/token'
const SCOPES = 'openid email offline_access'
const STATE_TTL_MS = 10 * 60 * 1000

type StatePayload = {
  userId: string
  orgId: string | null
  redirectTo: string
  codeVerifier: string
  ts: number
}

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

@Injectable()
export class HiggsfieldOAuthService {
  private readonly clientId: string
  private readonly redirectUri: string
  private readonly stateSecret: string
  private readonly appUrl: string

  constructor(
    config: ConfigService,
    private readonly repository: HiggsfieldRepository,
    private readonly connections: IntegrationConnectionsRepository,
    private readonly probe: McpProbeService,
    private readonly serviceClient: SupabaseServiceClient,
  ) {
    this.clientId = config.get<string>('HIGGSFIELD_OAUTH_CLIENT_ID')?.trim() || ''
    this.redirectUri =
      config.get<string>('HIGGSFIELD_OAUTH_REDIRECT_URI')?.trim() ||
      `${resolvePlatformApiUrl().replace(/\/+$/, '')}/api/integrations/higgsfield/callback`
    this.stateSecret =
      config.get<string>('HIGGSFIELD_OAUTH_STATE_SECRET')?.trim() ||
      config.get<string>('VAULT_ENCRYPTION_KEY')?.trim() ||
      ''
    this.appUrl = config.get<string>('APP_URL')?.trim() || resolveAppUrl()
  }

  getAuthorizationUrl(scope: RequestScope, redirectTo: string): string {
    this.assertConfigured()
    const codeVerifier = randomBytes(32).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    const state = this.signState({
      userId: scope.userId,
      orgId: scope.orgId,
      redirectTo: this.normalizeRedirectTo(redirectTo),
      codeVerifier,
      ts: Date.now(),
    })
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      scope: SCOPES,
      resource: RESOURCE,
    })
    return `${AUTHORIZATION_ENDPOINT}?${params.toString()}`
  }

  async handleCallback(code: string, state: string): Promise<string> {
    this.assertConfigured()
    const parsedState = this.verifyState(state)
    const tokens = await this.exchangeCode(code, parsedState.codeVerifier)
    if (!tokens.access_token) throw new BadRequestException('Higgsfield did not return access')

    const expiresAt =
      typeof tokens.expires_in === 'number'
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null
    const saved = await this.repository.saveConnection({
      scope: {
        userId: parsedState.userId,
        orgId: parsedState.orgId,
        orgRole: parsedState.orgId ? 'admin' : null,
      },
      tokenBundle: serializeMcpOAuthTokenBundle({
        version: MCP_OAUTH_TOKEN_BUNDLE_VERSION,
        provider: INTEGRATION_ID,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
        clientId: this.clientId,
        tokenEndpoint: TOKEN_ENDPOINT,
        resource: RESOURCE,
        scope: tokens.scope ?? SCOPES,
      }),
    })

    const probe = await this.probe
      .refreshToolsAndResources(RESOURCE, tokens.access_token)
      .catch(() => null)
    if (probe?.ok) {
      await this.repository.updateProbe(saved.serverId, {
        tools: probe.tools,
        resources: probe.resources,
      })
    }

    const now = new Date().toISOString()
    await this.connections.upsertConnection(
      INTEGRATION_ID,
      parsedState.userId,
      {
        user_id: parsedState.userId,
        org_id: parsedState.orgId,
        integration_id: INTEGRATION_ID,
        provider: INTEGRATION_ID,
        status: 'connected',
        scope_mode: parsedState.orgId ? 'org_shared' : 'personal',
        access_token: null,
        refresh_token: null,
        token_expires_at: expiresAt,
        connected_at: now,
        error_message: null,
        metadata: {
          server_id: saved.serverId,
          server_url: RESOURCE,
          token_storage: 'vault_secrets',
          tool_count: probe?.ok ? probe.tools.length : 0,
        },
        updated_at: now,
      },
      parsedState.orgId,
      parsedState.orgId ? 'org_shared' : 'personal',
      'Could not save the Higgsfield connection',
    )

    return this.buildBridgeUrl(parsedState.redirectTo)
  }

  async disconnect(scope: RequestScope): Promise<void> {
    await this.repository.removeConnection(scope)
    const integration = await this.connections.getStatus(
      this.serviceClient.client,
      INTEGRATION_ID,
      scope.userId,
      scope.orgId,
    )
    if (integration?.id) {
      await this.connections.markDisconnectedById(
        this.serviceClient.client,
        integration.id,
        'Could not disconnect Higgsfield',
      )
    }
  }

  private async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
        client_id: this.clientId,
        resource: RESOURCE,
      }),
    })
    if (!response.ok) throw new BadRequestException('Higgsfield rejected the connection')
    return (await response.json()) as TokenResponse
  }

  private assertConfigured(): void {
    if (!this.clientId || !this.stateSecret) {
      throw new BadRequestException('Higgsfield connection is not configured')
    }
  }

  private normalizeRedirectTo(value: string): string {
    try {
      const target = new URL(value)
      if (target.origin !== new URL(this.appUrl).origin) return this.appUrl
      return target.toString()
    } catch {
      return this.appUrl
    }
  }

  private buildBridgeUrl(redirectTo: string): string {
    const bridge = new URL('/integrations/connected', this.appUrl)
    bridge.searchParams.set('composio_connected', '1')
    bridge.searchParams.set('integration', INTEGRATION_ID)
    bridge.searchParams.set('redirect_to', redirectTo)
    return bridge.toString()
  }

  private signState(payload: StatePayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
    const signature = createHmac('sha256', this.stateSecret).update(encoded).digest('base64url')
    return `${encoded}.${signature}`
  }

  private verifyState(state: string): StatePayload {
    const [encoded, signature] = state.split('.')
    if (!encoded || !signature) throw new BadRequestException('Invalid Higgsfield session')
    const expected = createHmac('sha256', this.stateSecret).update(encoded).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new BadRequestException('Invalid Higgsfield session')
    }
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StatePayload
      if (!payload.userId || !payload.codeVerifier || Date.now() - payload.ts > STATE_TTL_MS) {
        throw new Error('expired')
      }
      return payload
    } catch {
      throw new BadRequestException('Higgsfield session expired')
    }
  }
}
