import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactLegacySessionCampaignRepository } from '../repositories/artifact-legacy-session-campaign.repository'
import { normalizeCampaignName, resolveCampaignIdByName } from './artifact-campaign-name-resolver'
import { ArtifactSessionKeyParserService } from './artifact-session-key-parser.service'
import { canAccessThemeForUser, normalizeThemeId } from './theme-id.util'

@Injectable()
export class ArtifactLegacySessionCampaignService {
  constructor(
    private readonly repository = new ArtifactLegacySessionCampaignRepository(),
    private readonly sessionKeyParser = new ArtifactSessionKeyParserService(),
  ) {}

  async getThemeTableName(target: Record<string, any>): Promise<'branding_themes' | 'themes'> {
    if (target.themeTableNamePromise) return target.themeTableNamePromise
    target.themeTableNamePromise = (async () => {
      const brandingCheck = await this.repository.checkThemeTable(
        target.serviceClient,
        'branding_themes',
      )
      if (!brandingCheck.error) return 'branding_themes'

      const themesCheck = await this.repository.checkThemeTable(target.serviceClient, 'themes')
      if (!themesCheck.error) return 'themes'

      throw new Error('No themes table found (checked branding_themes, themes)')
    })()
    return target.themeTableNamePromise
  }

  decodeJwtExpSeconds(token: string): number | null {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1] ?? ''
    try {
      const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
      const json = Buffer.from(padded, 'base64').toString('utf8')
      const parsed = JSON.parse(json) as { exp?: number }
      return typeof parsed.exp === 'number' ? parsed.exp : null
    } catch {
      return null
    }
  }

  isJwtExpiredOrNearExpiry(token: string, skewSeconds = 30): boolean {
    const exp = this.decodeJwtExpSeconds(token)
    if (!exp) return true
    const now = Math.floor(Date.now() / 1000)
    return exp <= now + skewSeconds
  }

  async refreshAccessToken(
    target: Record<string, any>,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const res = await fetch(`${target.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: target.supabaseAnonKey,
        Authorization: `Bearer ${target.supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to refresh Supabase token: ${res.status} ${text.slice(0, 200)}`)
    }
    const json = (await res.json()) as { access_token?: string; refresh_token?: string }
    if (!json.access_token)
      throw new Error('Failed to refresh Supabase token: missing access_token')
    return { accessToken: json.access_token, refreshToken: json.refresh_token }
  }

  async getAccessTokenFromSessionKey(
    target: Record<string, any>,
    sessionKey: string,
    userId: string,
  ): Promise<string> {
    if (sessionKey.includes('::admin-skill-builder')) {
      return ''
    }
    if (this.isMissionSessionKey(sessionKey)) {
      const mintAccessToken = target.userSessionMint?.mintAccessToken
      if (typeof mintAccessToken !== 'function') {
        throw new Error('Mission user session mint is not configured')
      }
      return target.userSessionMint.mintAccessToken(userId)
    }
    const conversationId = this.parseConversationId(sessionKey)
    if (!conversationId) {
      throw new Error('Invalid x-session-key format')
    }

    const ctx = target.requestContext.get(conversationId)
    if (ctx?.userId && ctx.userId !== userId) {
      throw new Error('Invalid request context user mismatch')
    }

    const token = ctx?.accessToken ?? ''
    const refreshToken = ctx?.refreshToken ?? null
    const needsRefresh = !token || this.isJwtExpiredOrNearExpiry(token)

    if (!needsRefresh) return token
    if (!refreshToken) {
      if (token) return token
      throw new Error('No access token or refresh token available for this session')
    }

    const refreshed = await this.refreshAccessToken(target, refreshToken)
    target.requestContext.set(
      conversationId,
      ctx?.userId ?? userId,
      ctx?.campaignId ?? null,
      refreshed.accessToken,
      refreshed.refreshToken ?? refreshToken,
      ctx?.modelId ?? null,
      ctx?.orgId ?? null,
      ctx?.channel ?? 'studio',
      ctx?.channelMember ?? null,
      ctx?.spaceId ?? null,
      ctx?.scopeKind ?? 'unknown',
    )
    return refreshed.accessToken
  }

  createRlsClient(target: Record<string, any>, accessToken: string) {
    return target.clientFactory.createUserClient(accessToken)
  }

  async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey: string,
  ): Promise<SupabaseClient> {
    if (this.isMissionSessionKey(sessionKey)) {
      return target.serviceClient
    }
    try {
      return this.createRlsClient(
        target,
        await this.getAccessTokenFromSessionKey(target, sessionKey, userId),
      )
    } catch {
      return target.serviceClient
    }
  }

  parseUserId(sessionKey: string): string | null {
    return this.sessionKeyParser.parseUserId(sessionKey)
  }

  parseConversationId(sessionKey: string): string | null {
    return this.sessionKeyParser.parseConversationId(sessionKey)
  }

  parseSessionIds(sessionKey: string): { userId: string; conversationId: string | null } | null {
    return this.sessionKeyParser.parseSessionIds(sessionKey)
  }

  isMissionSessionKey(sessionKey: string): boolean {
    return this.sessionKeyParser.isMissionSessionKey(sessionKey)
  }

  parseCampaignIdFromSessionKey(sessionKey: string): string | null {
    return this.sessionKeyParser.parseCampaignIdFromSessionKey(sessionKey)
  }

  parseSpaceIdFromSessionKey(sessionKey: string): string | null {
    return this.sessionKeyParser.parseSpaceIdFromSessionKey(sessionKey)
  }

  parseOrgIdFromSessionKey(sessionKey: string): string | null {
    return this.sessionKeyParser.parseOrgIdFromSessionKey(sessionKey)
  }

  parseOrgIdFromGatewayPrefix(sessionKey: string): string | null {
    return this.sessionKeyParser.parseOrgIdFromGatewayPrefix(sessionKey)
  }

  resolveActiveConversationIdForContext(sessionKey?: string): string | null {
    return sessionKey ? this.parseConversationId(sessionKey) : null
  }

  resolveActiveSpaceIdForContext(target: Record<string, any>, sessionKey?: string): string | null {
    if (!sessionKey) return null
    const fromSessionKey = this.parseSpaceIdFromSessionKey(sessionKey)
    if (fromSessionKey) return fromSessionKey
    const conversationId = this.parseConversationId(sessionKey)
    if (!conversationId) return null
    const ctx = target.requestContext?.get?.(conversationId)
    return typeof ctx?.spaceId === 'string' && ctx.spaceId.trim().length > 0
      ? ctx.spaceId.trim()
      : null
  }

  async resolveActiveCampaignIdForContext(
    target: Record<string, any>,
    supabase: SupabaseClient,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    if (!sessionKey) return null
    const fromSessionKey = this.parseCampaignIdFromSessionKey(sessionKey)
    if (fromSessionKey) return fromSessionKey

    const conversationId = this.parseConversationId(sessionKey)
    if (!conversationId) return null
    const ctx = target.requestContext?.get?.(conversationId)
    if (ctx?.userId && ctx.userId !== userId) {
      throw new Error('Invalid request context user mismatch')
    }
    if (typeof ctx?.campaignId === 'string' && ctx.campaignId.trim().length > 0) {
      return ctx.campaignId.trim()
    }
    if (ctx && (ctx.spaceId || ctx.scopeKind === 'personal')) {
      return null
    }

    const { data, error } = await this.repository.findConversationCampaign(supabase, {
      conversationId,
      userId,
    })
    if (error) throw error
    return typeof data?.campaign_id === 'string' && data.campaign_id.trim().length > 0
      ? data.campaign_id.trim()
      : null
  }

  async resolveCampaignIdByNameReadOnly(
    supabase: SupabaseClient,
    userId: string,
    campaignName: string,
    orgId?: string | null,
  ): Promise<string> {
    return resolveCampaignIdByName(this.repository, supabase, userId, campaignName, orgId)
  }

  async findGeneralCampaignId(supabase: SupabaseClient, userId: string): Promise<string | null> {
    const { data, error } = await this.repository.findGeneralCampaignId(supabase, userId)
    if (error) throw error
    return (data?.id as string | undefined) ?? null
  }

  async ensureGeneralCampaignId(
    target: Record<string, any>,
    supabase: SupabaseClient,
    userId: string,
    sessionKey?: string,
  ): Promise<string> {
    const existingId = await this.findGeneralCampaignId(supabase, userId)
    if (existingId) {
      await this.attachConversationToCampaignIfUnset(supabase, userId, sessionKey, existingId)
      return existingId
    }

    const { data: inserted, error: insertError } = await this.repository.createGeneralCampaign(
      supabase,
      userId,
    )
    if (insertError) {
      const afterInsertId = await this.findGeneralCampaignId(supabase, userId)
      if (afterInsertId) return afterInsertId
      throw insertError
    }

    const generalCampaignId = String(inserted.id)
    await this.attachConversationToCampaignIfUnset(supabase, userId, sessionKey, generalCampaignId)

    return generalCampaignId
  }

  private async attachConversationToCampaign(
    supabase: SupabaseClient,
    userId: string,
    sessionKey: string | undefined,
    campaignId: string,
    onlyIfUnset: boolean,
  ): Promise<void> {
    const conversationId = sessionKey ? this.parseConversationId(sessionKey) : null
    if (!conversationId) return
    const { data: conversation, error: conversationError } =
      await this.repository.findConversationCampaign(supabase, { conversationId, userId })
    if (conversationError) throw conversationError
    if (!conversation) return

    const currentCampaignId = String(conversation.campaign_id ?? '')
    if (onlyIfUnset && currentCampaignId) return
    if (!onlyIfUnset && currentCampaignId === campaignId) return

    const { error: updateError } = await this.repository.updateConversationCampaign(supabase, {
      conversationId,
      userId,
      campaignId,
    })
    if (updateError) throw updateError
  }

  async attachConversationToCampaignIfUnset(
    supabase: SupabaseClient,
    userId: string,
    sessionKey: string | undefined,
    campaignId: string,
  ): Promise<void> {
    await this.attachConversationToCampaign(supabase, userId, sessionKey, campaignId, true)
  }

  resolveUserId(sessionKey?: string): string {
    if (!sessionKey) {
      throw new Error('Missing x-session-key header')
    }
    const parsed = this.parseUserId(sessionKey)
    if (!parsed) {
      throw new Error('Invalid x-session-key format')
    }
    return parsed
  }

  async resolveCampaignId(
    target: Record<string, any>,
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    const campaignIdFromSessionKey = sessionKey
      ? this.parseCampaignIdFromSessionKey(sessionKey)
      : null
    const isMissionSession = sessionKey ? this.isMissionSessionKey(sessionKey) : false
    let missionCampaignResolved = false
    let missionCampaignId: string | null = null
    const resolveMissionCampaignId = async (): Promise<string | null> => {
      if (!isMissionSession || missionCampaignResolved) return missionCampaignId
      missionCampaignResolved = true
      if (typeof target.resolveMissionContext !== 'function' || !sessionKey) return null
      const missionContext = await target.resolveMissionContext(sessionKey, userId)
      missionCampaignId =
        typeof missionContext?.campaignId === 'string' && missionContext.campaignId.trim()
          ? missionContext.campaignId.trim()
          : null
      return missionCampaignId
    }
    const explicit =
      typeof input.campaign_id === 'string' && input.campaign_id.trim().length > 0
        ? input.campaign_id.trim()
        : null
    if (explicit) {
      const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
      const { data, error } = await this.repository.findCampaignByScope(supabase, {
        campaignId: explicit,
        userId,
        orgId,
      })
      if (error) throw error
      if (!data?.id) {
        if (campaignIdFromSessionKey) {
          target.logger.warn(
            `[Campaign] Explicit campaign_id "${explicit}" not found for user, falling back to session campaign ${campaignIdFromSessionKey}`,
          )
        } else {
          throw new Error('campaign_id not found for user')
        }
      } else {
        const scopedMissionCampaignId = await resolveMissionCampaignId()
        if (scopedMissionCampaignId && scopedMissionCampaignId !== explicit) {
          throw new Error('campaign_id does not match mission campaign scope')
        }
        await this.attachConversationToCampaign(supabase, userId, sessionKey, explicit, false)
        return explicit
      }
    }

    const explicitName = normalizeCampaignName(input.campaign_name ?? input.campaignName)
    if (explicitName) {
      const nameOrgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
      const campaignId = await this.resolveCampaignIdByNameReadOnly(
        supabase,
        userId,
        explicitName,
        nameOrgId,
      )
      await this.attachConversationToCampaign(supabase, userId, sessionKey, campaignId, false)
      return campaignId
    }

    if (campaignIdFromSessionKey) {
      const scopedMissionCampaignId = await resolveMissionCampaignId()
      if (scopedMissionCampaignId && scopedMissionCampaignId !== campaignIdFromSessionKey) {
        throw new Error('session campaign_id does not match mission campaign scope')
      }
      return campaignIdFromSessionKey
    }

    if (sessionKey) {
      const conversationId = this.parseConversationId(sessionKey)
      if (conversationId) {
        const ctx = target.requestContext.get(conversationId)
        if (ctx?.userId && ctx.userId !== userId) {
          throw new Error('Invalid request context user mismatch')
        }
        if (ctx?.campaignId) {
          target.logger.debug(`[Campaign] Resolved from request context: ${ctx.campaignId}`)
          return ctx.campaignId
        }
        if (ctx && (ctx.spaceId || ctx.scopeKind === 'personal')) {
          target.logger.debug('[Campaign] Resolved personal scope from request context')
          return null
        }
      }
    }

    if (isMissionSession) {
      const scopedMissionCampaignId = await resolveMissionCampaignId()
      if (scopedMissionCampaignId) return scopedMissionCampaignId
      target.logger?.warn?.(
        '[Campaign] Mission session has no campaign scope; refusing General fallback',
      )
      return null
    }

    if (sessionKey) {
      const conversationId = this.parseConversationId(sessionKey)
      if (conversationId) {
        const { data } = await this.repository.findConversationCampaign(supabase, {
          conversationId,
          userId,
        })
        if (data?.campaign_id) {
          return data.campaign_id as string
        }
      }
    }
    return this.ensureGeneralCampaignId(target, supabase, userId, sessionKey)
  }

  parseThemeId(value: unknown): string | null {
    return normalizeThemeId(value)
  }

  async validateThemeOwnership(
    target: Record<string, any>,
    supabase: SupabaseClient,
    userId: string,
    themeId: string,
  ): Promise<void> {
    const table = await this.getThemeTableName(target)
    const { data, error } = await this.repository.findTheme(supabase, table, themeId)
    if (error) throw error
    if (!data) throw new Error('theme_id not found for user')

    const row = data as Record<string, unknown>
    if (!canAccessThemeForUser(row, userId)) {
      throw new Error('theme_id not found for user')
    }
  }

  async resolveThemeId(
    target: Record<string, any>,
    supabase: SupabaseClient,
    input: Record<string, unknown>,
    userId: string,
    campaignId: string | null,
  ): Promise<string | null> {
    const hasExplicitThemeId = Object.prototype.hasOwnProperty.call(input, 'theme_id')
    if (hasExplicitThemeId) {
      const explicitRaw = input.theme_id
      if (explicitRaw === null || explicitRaw === '') return null
      const explicitThemeId = this.parseThemeId(explicitRaw)
      if (!explicitThemeId) throw new Error('theme_id must be a valid UUID')
      await this.validateThemeOwnership(target, supabase, userId, explicitThemeId)
      return explicitThemeId
    }

    if (!campaignId) return null

    const { data, error } = await this.repository.findCampaignConfig(supabase, {
      campaignId,
      userId,
    })
    if (error) throw error
    if (!data) return null

    const config = (data.config ?? {}) as Record<string, unknown>
    const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
    const campaignThemeId = this.parseThemeId(agentSettings.theme_id)
    if (!campaignThemeId) return null

    await this.validateThemeOwnership(target, supabase, userId, campaignThemeId)
    return campaignThemeId
  }

  async isMediaGenerationEnabled(supabase: SupabaseClient, campaignId: string): Promise<boolean> {
    const { data, error } = await this.repository.findCampaignConfig(supabase, { campaignId })

    if (error) throw error
    if (!data) return true

    const config = (data.config ?? {}) as Record<string, unknown>
    const agentSettings = (config.agent_settings ?? {}) as Record<string, unknown>
    return agentSettings.media_generation_enabled !== false
  }

  async getMediaGenerationStatus(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey as string)
    const campaignId = await this.resolveCampaignId(target, supabase, input, userId, sessionKey)
    if (!campaignId) {
      return {
        success: false,
        enabled: false,
        error: 'campaign_id required. Select a campaign first.',
      }
    }

    const enabled = await this.isMediaGenerationEnabled(supabase, campaignId)
    return { success: true, campaign_id: campaignId, enabled }
  }

  parseAgentIdFromSessionKey(sessionKey: string): string | null {
    return this.sessionKeyParser.parseAgentIdFromSessionKey(sessionKey)
  }
}
