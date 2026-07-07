import { createHash, createHmac, randomBytes } from 'crypto'
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getAllowedMcpScopesForOrgRole,
  getMcpPermissionGroupsForScopes,
  isMcpScope,
  MCP_BASE_SCOPE,
  MCP_V1_SCOPES,
  type McpOrgRole,
} from '@vibey/agent-policy'
import { SupabaseServiceClient, UserSessionMintService } from '@vibey/api-shared'
import type {
  McpAuthorizeQueryDto,
  McpConsentDto,
  McpIntrospectDto,
  McpRegisterClientDto,
  McpRevokeDto,
  McpTokenDto,
} from '../dto/mcp-oauth.dto'
import {
  resolveApprovedMcpScopes,
  resolveEffectiveMcpConsentOrgId,
} from '../mcp-oauth-consent.util'
import { McpOAuthConsentRepository } from '../repositories/mcp-oauth-consent.repository'
import { McpOAuthRepository } from '../repositories/mcp-oauth.repository'
import {
  base64Url,
  hashSecret,
  safeCompare,
  secondsFromEnv,
  TOKEN_TYPE,
} from './mcp-oauth-crypto.util'
import type { AuthorizationRequestRow, OAuthClientRow } from './mcp-oauth.types'

@Injectable()
export class McpOAuthService {
  private readonly serviceClient: SupabaseClient

  constructor(
    service: SupabaseServiceClient,
    private readonly consentRepository: McpOAuthConsentRepository,
    private readonly userSessionMint: UserSessionMintService,
    private readonly oauthRepository: McpOAuthRepository = new McpOAuthRepository(),
  ) {
    this.serviceClient = service.client
  }

  authorizationServerMetadata() {
    const issuer = this.issuerUrl()
    return {
      issuer,
      authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
      token_endpoint: `${issuer}/api/mcp/oauth/token`,
      registration_endpoint: `${issuer}/api/mcp/oauth/register`,
      revocation_endpoint: `${issuer}/api/mcp/oauth/revoke`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      scopes_supported: MCP_V1_SCOPES,
      resource_parameter_supported: true,
      client_id_metadata_document_supported: false,
    }
  }

  async registerClient(dto: McpRegisterClientDto) {
    const clientId = `mcp_client_${base64Url(randomBytes(24))}`
    const clientName = dto.client_name?.trim() || 'MCP Client'
    const grantTypes = dto.grant_types?.length
      ? dto.grant_types
      : ['authorization_code', 'refresh_token']
    const responseTypes = dto.response_types?.length ? dto.response_types : ['code']
    const tokenEndpointAuthMethod = dto.token_endpoint_auth_method ?? 'none'
    await this.oauthRepository.insertClient(this.serviceClient, {
      client_id: clientId,
      client_name: clientName,
      client_uri: dto.client_uri ?? null,
      logo_uri: dto.logo_uri ?? null,
      redirect_uris: dto.redirect_uris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
      is_first_party: false,
      is_enabled: true,
      metadata: { dynamic_client_registration: true },
    })
    return {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: clientName,
      ...(dto.client_uri ? { client_uri: dto.client_uri } : {}),
      ...(dto.logo_uri ? { logo_uri: dto.logo_uri } : {}),
      redirect_uris: dto.redirect_uris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: tokenEndpointAuthMethod,
    }
  }

  async startAuthorization(query: McpAuthorizeQueryDto): Promise<string> {
    const client = await this.resolveClient(query.client_id)
    if (!client.is_enabled) throw new BadRequestException('OAuth client is disabled')
    if (!client.redirect_uris.includes(query.redirect_uri)) {
      throw new BadRequestException('redirect_uri is not allowed for this client')
    }
    const resource = this.normalizeResourceUrl(query.resource)
    this.assertCanonicalResource(resource)
    const scopes = this.normalizeScopes(query.scope)
    const requestId = `mcp_auth_req_${base64Url(randomBytes(32))}`
    const signature = this.signAuthorizationRequest({
      requestId,
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      resource,
      scope: scopes.join(' '),
      codeChallenge: query.code_challenge,
    })

    const expiresAt = new Date(Date.now() + secondsFromEnv('MCP_AUTH_CODE_TTL_SECONDS', 600) * 1000)
    await this.oauthRepository.createAuthorizationRequest(this.serviceClient, {
      request_id: requestId,
      request_signature: signature,
      client_id: query.client_id,
      redirect_uri: query.redirect_uri,
      resource,
      scope: scopes.join(' '),
      scopes,
      state: query.state ?? null,
      code_challenge: query.code_challenge,
      code_challenge_method: query.code_challenge_method,
      org_id: query.org_id ?? null,
      client_metadata: {
        client_name: client.client_name,
        client_uri: client.client_uri,
        logo_uri: client.logo_uri,
      },
      expires_at: expiresAt.toISOString(),
    })

    const consentUrl = new URL(
      process.env.MCP_WEB_CONSENT_URL ?? 'http://localhost:3000/mcp/consent',
    )
    consentUrl.searchParams.set('request_id', requestId)
    consentUrl.searchParams.set('client_id', query.client_id)
    return consentUrl.toString()
  }

  async getAuthorizationRequest(requestId: string, userId: string) {
    const request = await this.loadAuthorizationRequest(requestId)
    this.assertActiveAuthorizationRequest(request)
    this.verifyAuthorizationRequestSignature(request)
    const account_options = await this.consentRepository.listSelectableAccounts(
      userId,
      request.org_id,
    )
    const account = request.org_id
      ? account_options[0]
      : await this.consentRepository.resolveAccountPreview(null)
    const permissions = getMcpPermissionGroupsForScopes(request.scopes, { baseScopeMeansAll: true })
    return {
      client_id: request.client_id,
      client_name: String(request.client_metadata?.client_name ?? request.client_id),
      client_uri: (request.client_metadata?.client_uri as string | null) ?? null,
      logo_uri: (request.client_metadata?.logo_uri as string | null) ?? null,
      resource: request.resource,
      scopes: request.scopes,
      account,
      account_options,
      permissions,
      org_id: request.org_id,
      expires_at: request.expires_at,
    }
  }

  async approveConsent(
    dto: McpConsentDto,
    user: { id: string },
    orgId: string | null,
    orgRole: McpOrgRole | null,
  ) {
    const request = await this.loadAuthorizationRequest(dto.request_id)
    this.assertActiveAuthorizationRequest(request)
    this.verifyAuthorizationRequestSignature(request)
    const effectiveOrgId = resolveEffectiveMcpConsentOrgId(dto, request, orgId)
    const approvedScopes = resolveApprovedMcpScopes(dto, request)
    this.assertScopesWithinRole(approvedScopes, orgRole, !effectiveOrgId)

    const consent = await this.oauthRepository.upsertConsent(this.serviceClient, {
      client_id: request.client_id,
      user_id: user.id,
      org_id: effectiveOrgId,
      org_role: orgRole,
      scopes: approvedScopes,
      status: 'active',
      revoked_at: null,
      metadata: { resource: request.resource },
    })

    const code = `mcp_code_${base64Url(randomBytes(32))}`
    await this.oauthRepository.createAuthorizationCode(this.serviceClient, {
      code_hash: hashSecret(code),
      client_id: request.client_id,
      user_id: user.id,
      org_id: effectiveOrgId,
      consent_id: consent.id,
      redirect_uri: request.redirect_uri,
      code_challenge: request.code_challenge,
      code_challenge_method: request.code_challenge_method,
      scopes: approvedScopes,
      resource: request.resource,
      state: request.state,
      expires_at: new Date(
        Date.now() + secondsFromEnv('MCP_AUTH_CODE_TTL_SECONDS', 600) * 1000,
      ).toISOString(),
    })
    await this.consumeAuthorizationRequest(request.request_id)
    return { success: true, redirect_uri: this.buildRedirectUri(request, { code }) }
  }

  async denyConsent(dto: McpConsentDto) {
    const request = await this.loadAuthorizationRequest(dto.request_id)
    this.assertActiveAuthorizationRequest(request)
    this.verifyAuthorizationRequestSignature(request)
    await this.consumeAuthorizationRequest(request.request_id)
    return {
      success: true,
      redirect_uri: this.buildRedirectUri(request, { error: 'access_denied' }),
    }
  }

  async exchangeToken(dto: McpTokenDto) {
    const resource = this.normalizeResourceUrl(dto.resource)
    this.assertCanonicalResource(resource)
    if (dto.grant_type === 'refresh_token') return this.refreshToken(dto)
    if (!dto.code || !dto.redirect_uri || !dto.code_verifier) {
      throw new BadRequestException('code, redirect_uri, and code_verifier are required')
    }
    const codeRow = await this.oauthRepository.findAuthorizationCodeByHash(
      this.serviceClient,
      hashSecret(dto.code),
    )
    if (!codeRow) throw new BadRequestException('Invalid authorization code')
    if (codeRow.consumed_at) throw new BadRequestException('Authorization code already consumed')
    if (new Date(codeRow.expires_at).getTime() <= Date.now()) {
      throw new BadRequestException('Authorization code expired')
    }
    if (codeRow.client_id !== dto.client_id) throw new BadRequestException('client_id mismatch')
    if (codeRow.redirect_uri !== dto.redirect_uri)
      throw new BadRequestException('redirect_uri mismatch')
    if (this.normalizeResourceUrl(codeRow.resource) !== resource)
      throw new BadRequestException('resource mismatch')
    this.verifyPkce(dto.code_verifier, codeRow.code_challenge)
    const consumedCode = await this.oauthRepository.consumeAuthorizationCode(
      this.serviceClient,
      codeRow.id,
    )
    if (!consumedCode) throw new BadRequestException('Authorization code already consumed')
    return this.issueTokens(consumedCode)
  }

  async introspect(dto: McpIntrospectDto, internalToken: string | undefined) {
    this.assertInternalToken(internalToken)
    const row = await this.oauthRepository.findTokenByAccessHash(
      this.serviceClient,
      hashSecret(dto.token),
    )
    if (!row || row.revoked_at || row.mcp_oauth_consents?.status !== 'active')
      return { active: false }
    if (new Date(row.access_expires_at).getTime() <= Date.now()) return { active: false }
    const supabaseAccessToken = await this.userSessionMint.mintAccessToken(row.user_id)
    await this.oauthRepository.touchTokenLastUsed(this.serviceClient, row.id)
    return {
      active: true,
      user_id: row.user_id,
      org_id: row.org_id,
      client_id: row.client_id,
      scope: row.scopes.join(' '),
      scopes: row.scopes,
      exp: Math.floor(new Date(row.access_expires_at).getTime() / 1000),
      supabase_access_token: supabaseAccessToken,
      supabase_refresh_token: null,
    }
  }

  async revoke(dto: McpRevokeDto) {
    const tokenHash = hashSecret(dto.token)
    await this.oauthRepository.revokeTokenByHash(this.serviceClient, tokenHash)
    return { success: true }
  }

  async cleanupExpiredRows() {
    const now = new Date().toISOString()
    const auditCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await this.oauthRepository.cleanupExpiredRows(this.serviceClient, now, auditCutoff)
    return { success: true }
  }

  private async resolveClient(clientId: string): Promise<OAuthClientRow> {
    if (clientId.startsWith('http://') || clientId.startsWith('https://')) {
      throw new BadRequestException('URL-based OAuth client metadata documents are not supported')
    }
    const data = await this.oauthRepository.findClient(this.serviceClient, clientId)
    if (!data) throw new BadRequestException('Unknown OAuth client')
    return data
  }

  private normalizeScopes(scope: string | undefined): string[] {
    const requested = (scope ?? MCP_BASE_SCOPE).split(/\s+/).filter(Boolean)
    const scopes = Array.from(new Set([MCP_BASE_SCOPE, ...requested]))
    for (const item of scopes) {
      if (!isMcpScope(item)) throw new BadRequestException(`Unsupported MCP scope: ${item}`)
    }
    return scopes
  }

  private assertScopesWithinRole(scopes: string[], role: McpOrgRole | null, personal: boolean) {
    const allowed = new Set(getAllowedMcpScopesForOrgRole(role, personal))
    for (const scope of scopes) {
      if (!allowed.has(scope as any)) throw new ForbiddenException(`Scope not allowed: ${scope}`)
    }
  }

  private async loadAuthorizationRequest(requestId: string): Promise<AuthorizationRequestRow> {
    const data = await this.oauthRepository.findAuthorizationRequest(this.serviceClient, requestId)
    if (!data) throw new BadRequestException('Authorization request not found')
    return data
  }

  private assertActiveAuthorizationRequest(request: AuthorizationRequestRow) {
    if (request.consumed_at) throw new BadRequestException('Authorization request already consumed')
    if (new Date(request.expires_at).getTime() <= Date.now()) {
      throw new BadRequestException('Authorization request expired')
    }
  }

  private async consumeAuthorizationRequest(requestId: string) {
    await this.oauthRepository.consumeAuthorizationRequest(this.serviceClient, requestId)
  }

  private signAuthorizationRequest(input: {
    requestId: string
    clientId: string
    redirectUri: string
    resource: string
    scope: string
    codeChallenge: string
  }): string {
    const secret = process.env.INTERNAL_API_TOKEN
    if (!secret) throw new Error('INTERNAL_API_TOKEN is required')
    return createHmac('sha256', secret)
      .update(
        [
          input.requestId,
          input.clientId,
          input.redirectUri,
          input.resource,
          input.scope,
          input.codeChallenge,
        ].join('|'),
      )
      .digest('hex')
  }

  private verifyAuthorizationRequestSignature(request: AuthorizationRequestRow) {
    const expected = this.signAuthorizationRequest({
      requestId: request.request_id,
      clientId: request.client_id,
      redirectUri: request.redirect_uri,
      resource: request.resource,
      scope: request.scope,
      codeChallenge: request.code_challenge,
    })
    if (!safeCompare(expected, request.request_signature)) {
      throw new BadRequestException('Authorization request signature mismatch')
    }
  }

  private verifyPkce(codeVerifier: string, codeChallenge: string) {
    const digest = base64Url(createHash('sha256').update(codeVerifier).digest())
    if (!safeCompare(digest, codeChallenge)) throw new BadRequestException('Invalid PKCE verifier')
  }

  private async issueTokens(codeRow: Record<string, any>) {
    const accessToken = `mcp_at_${base64Url(randomBytes(32))}`
    const refreshToken = `mcp_rt_${base64Url(randomBytes(32))}`
    const accessTtl = secondsFromEnv('MCP_ACCESS_TOKEN_TTL_SECONDS', 3600)
    const refreshTtl = secondsFromEnv('MCP_REFRESH_TOKEN_TTL_SECONDS', 2592000)
    await this.oauthRepository.createToken(this.serviceClient, {
      access_token_hash: hashSecret(accessToken),
      refresh_token_hash: hashSecret(refreshToken),
      client_id: codeRow.client_id,
      user_id: codeRow.user_id,
      org_id: codeRow.org_id,
      consent_id: codeRow.consent_id,
      supabase_refresh_vault_secret_id: null,
      scopes: codeRow.scopes,
      resource: codeRow.resource,
      access_expires_at: new Date(Date.now() + accessTtl * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + refreshTtl * 1000).toISOString(),
    })
    return {
      access_token: accessToken,
      token_type: TOKEN_TYPE,
      expires_in: accessTtl,
      refresh_token: refreshToken,
      scope: codeRow.scopes.join(' '),
    }
  }

  private async refreshToken(dto: McpTokenDto) {
    if (!dto.refresh_token) throw new BadRequestException('refresh_token is required')
    const row = await this.oauthRepository.findTokenByRefreshHash(
      this.serviceClient,
      hashSecret(dto.refresh_token),
    )
    if (!row || row.revoked_at) throw new BadRequestException('Invalid refresh token')
    if (new Date(row.refresh_expires_at).getTime() <= Date.now()) {
      throw new BadRequestException('Refresh token expired')
    }
    const revokedToken = await this.oauthRepository.revokeRefreshToken(this.serviceClient, row.id)
    if (!revokedToken) throw new BadRequestException('Invalid refresh token')
    return this.issueTokens(revokedToken)
  }

  private buildRedirectUri(
    request: AuthorizationRequestRow,
    result: { code?: string; error?: string },
  ) {
    const url = new URL(request.redirect_uri)
    if (result.code) url.searchParams.set('code', result.code)
    if (result.error) url.searchParams.set('error', result.error)
    if (request.state) url.searchParams.set('state', request.state)
    return url.toString()
  }

  private normalizeResourceUrl(resource: string): string {
    const withoutTrailingSlash = resource.replace(/\/+$/, '')
    return withoutTrailingSlash.replace(/\/api\/(?:mcp|vibey-mcp)$/, '') || withoutTrailingSlash
  }

  private assertCanonicalResource(resource: string) {
    const canonical = this.normalizeResourceUrl(resource)
    const expected = this.normalizeResourceUrl(this.resourceUrl())
    if (canonical !== expected) throw new BadRequestException('Invalid resource')
  }

  private assertInternalToken(internalToken: string | undefined) {
    if (!process.env.INTERNAL_API_TOKEN || internalToken !== process.env.INTERNAL_API_TOKEN) {
      throw new UnauthorizedException('Invalid internal token')
    }
  }

  private issuerUrl() {
    return (
      process.env.MCP_OAUTH_ISSUER_URL ??
      process.env.API_URL ??
      'http://localhost:3001'
    ).replace(/\/$/, '')
  }

  private resourceUrl() {
    return this.normalizeResourceUrl(process.env.MCP_RESOURCE_URL ?? 'https://mcp.vibey.im')
  }
}
