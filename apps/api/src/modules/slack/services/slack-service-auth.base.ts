import { createHmac } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentChannel } from '../types/slack.types'
import {
  formatSlackAskIdentityContext,
  type SlackAskClientStamp,
} from './slack-ask-identity-context'
import { SlackServiceBase } from './slack-service.base'
import {
  SUPABASE_USER_ACCESS_TOKEN_KEY,
  SUPABASE_USER_REFRESH_TOKEN_KEY,
  type OAuthStatePayload,
} from './slack-service.shared'

export abstract class SlackAuthBase extends SlackServiceBase {
  protected async getChannelAccessToken(
    serviceSupabase: SupabaseClient,
    channel: AgentChannel,
  ): Promise<string> {
    const providerConfig = channel.provider_config as Record<string, unknown>
    const channelOrgId = channel.org_id
    const storedAccessToken =
      typeof providerConfig.user_access_token === 'string' ? providerConfig.user_access_token : null
    const storedRefreshToken =
      typeof providerConfig.user_refresh_token === 'string'
        ? providerConfig.user_refresh_token
        : null
    const integration = await this.slackRepo.getIntegration(
      serviceSupabase,
      channel.user_id,
      channelOrgId,
    )
    const integrationMetadata =
      integration?.metadata && typeof integration.metadata === 'object'
        ? (integration.metadata as Record<string, unknown>)
        : {}
    const canonicalAccessToken = this.readCanonicalToken(
      integrationMetadata,
      SUPABASE_USER_ACCESS_TOKEN_KEY,
      'user_access_token',
    )
    const canonicalRefreshToken = this.readCanonicalToken(
      integrationMetadata,
      SUPABASE_USER_REFRESH_TOKEN_KEY,
      'user_refresh_token',
    )
    const refreshCandidates: string[] = []
    if (canonicalRefreshToken) refreshCandidates.push(canonicalRefreshToken)
    if (storedRefreshToken && storedRefreshToken !== canonicalRefreshToken) {
      refreshCandidates.push(storedRefreshToken)
    }

    const refreshErrors: string[] = []
    for (let idx = 0; idx < refreshCandidates.length; idx += 1) {
      const refreshToken = refreshCandidates[idx] ?? ''
      if (!refreshToken) continue
      const refreshed = await this.refreshSupabaseTokenWithInProcessLock(
        channel.user_id,
        refreshToken,
      )
      if (refreshed) {
        const nextProviderConfig = {
          ...providerConfig,
          user_access_token: refreshed.accessToken,
          user_refresh_token: refreshed.refreshToken,
        }
        await this.persistCanonicalSupabaseTokens(
          serviceSupabase,
          channel.user_id,
          refreshed.accessToken,
          refreshed.refreshToken,
          channelOrgId,
        ).catch((err) =>
          this.logger.warn(`Failed to persist canonical refreshed Slack Supabase tokens: ${err}`),
        )
        await this.slackRepo
          .updateChannel(serviceSupabase, channel.user_id, channel.id, {
            provider_config: nextProviderConfig,
          })
          .catch((err) => this.logger.warn(`Failed to persist refreshed Slack user tokens: ${err}`))
        return refreshed.accessToken
      }

      refreshErrors.push(`refresh attempt ${idx + 1} failed`)
      const refreshedIntegration = await this.slackRepo.getIntegration(
        serviceSupabase,
        channel.user_id,
        channelOrgId,
      )
      const refreshedMetadata =
        refreshedIntegration?.metadata && typeof refreshedIntegration.metadata === 'object'
          ? (refreshedIntegration.metadata as Record<string, unknown>)
          : {}
      const latestCanonicalRefresh = this.readCanonicalToken(
        refreshedMetadata,
        SUPABASE_USER_REFRESH_TOKEN_KEY,
        'user_refresh_token',
      )
      if (latestCanonicalRefresh && !refreshCandidates.includes(latestCanonicalRefresh)) {
        refreshCandidates.push(latestCanonicalRefresh)
      }
    }

    if (canonicalAccessToken && !this.isJwtExpiredOrNearExpiry(canonicalAccessToken, 60)) {
      this.logger.warn(
        `[TRACE] getChannelAccessToken: refresh failed but canonical access token still valid, using it`,
      )
      return canonicalAccessToken
    }
    if (storedAccessToken && !this.isJwtExpiredOrNearExpiry(storedAccessToken, 60)) {
      this.logger.warn(
        `[TRACE] getChannelAccessToken: refresh failed but stored access token still valid, using it`,
      )
      return storedAccessToken
    }

    if (canonicalAccessToken) {
      this.logger.warn(
        `[TRACE] getChannelAccessToken: all refresh failed, using expired canonical access token as last resort`,
      )
      return canonicalAccessToken
    }
    if (storedAccessToken) {
      this.logger.warn(
        `[TRACE] getChannelAccessToken: all refresh failed, using expired stored access token as last resort`,
      )
      return storedAccessToken
    }

    throw new Error(
      `Slack channel missing refreshable user auth tokens${refreshErrors.length > 0 ? ` (${refreshErrors.join(', ')})` : ''}`,
    )
  }

  protected async refreshSupabaseTokenWithInProcessLock(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string | null } | null> {
    const existing = this.tokenRefreshInFlight.get(userId)
    if (existing) {
      return existing.catch(() => null)
    }

    const refreshPromise = this.refreshSupabaseToken(refreshToken)
    this.tokenRefreshInFlight.set(userId, refreshPromise)
    try {
      return await refreshPromise
    } catch {
      return null
    } finally {
      this.tokenRefreshInFlight.delete(userId)
    }
  }

  protected async refreshSupabaseToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string | null }> {
    return this.slackRuntimeRepo.refreshSupabaseSession(refreshToken)
  }

  protected decodeJwtExpSeconds(token: string): number | null {
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

  protected isJwtExpiredOrNearExpiry(token: string, skewSeconds = 30): boolean {
    const exp = this.decodeJwtExpSeconds(token)
    if (!exp) return true
    const now = Math.floor(Date.now() / 1000)
    return exp <= now + skewSeconds
  }

  protected readCanonicalToken(
    metadata: Record<string, unknown>,
    canonicalKey: string,
    legacyKey: string,
  ): string | null {
    const canonicalValue = metadata[canonicalKey]
    if (typeof canonicalValue === 'string' && canonicalValue.length > 0) return canonicalValue
    const legacyValue = metadata[legacyKey]
    if (typeof legacyValue === 'string' && legacyValue.length > 0) return legacyValue
    return null
  }

  protected async persistCanonicalSupabaseTokens(
    supabase: SupabaseClient,
    userId: string,
    accessToken: string,
    refreshToken: string | null,
    orgId?: string | null,
  ): Promise<void> {
    if (!accessToken) return
    await this.slackRepo.updateIntegrationMetadata(
      supabase,
      userId,
      {
        [SUPABASE_USER_ACCESS_TOKEN_KEY]: accessToken,
        [SUPABASE_USER_REFRESH_TOKEN_KEY]: refreshToken,
      },
      orgId,
    )
  }

  // ---------------------------------------------------------------------------
  // Deduplication
  // ---------------------------------------------------------------------------

  protected isDuplicateEvent(eventId: string): boolean {
    const now = Date.now()
    for (const [id, ts] of this.eventDedupe.entries()) {
      if (now - ts > this.eventDedupeTtlMs) this.eventDedupe.delete(id)
    }
    if (this.eventDedupe.has(eventId)) return true
    this.eventDedupe.set(eventId, now)
    return false
  }

  // ---------------------------------------------------------------------------
  // OAuth state encoding
  // ---------------------------------------------------------------------------

  protected encodeOAuthState(payload: OAuthStatePayload): string {
    const stateSecret = process.env.SLACK_OAUTH_STATE_SECRET
    if (!stateSecret) throw new Error('Missing SLACK_OAUTH_STATE_SECRET')
    const payloadJson = JSON.stringify(payload)
    const payloadB64 = Buffer.from(payloadJson, 'utf8').toString('base64url')
    const signature = createHmac('sha256', stateSecret).update(payloadB64).digest('hex')
    return `${payloadB64}.${signature}`
  }

  protected decodeOAuthState(state: string): OAuthStatePayload {
    const stateSecret = process.env.SLACK_OAUTH_STATE_SECRET
    if (!stateSecret) throw new Error('Missing SLACK_OAUTH_STATE_SECRET')
    const parts = state.split('.')
    if (parts.length !== 2) throw new Error('Invalid OAuth state format')
    const payloadB64 = parts[0] ?? ''
    const sig = parts[1] ?? ''
    const expectedSig = createHmac('sha256', stateSecret).update(payloadB64).digest('hex')
    if (expectedSig !== sig) throw new Error('Invalid OAuth state signature')

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8'),
    ) as OAuthStatePayload
    if (!payload.user_id || !payload.agent_key || !payload.ts || !payload.nonce) {
      throw new Error('Invalid OAuth state payload')
    }

    const ageMs = Date.now() - payload.ts
    if (ageMs > 10 * 60 * 1000) throw new Error('Expired OAuth state')
    return payload
  }

  // ---------------------------------------------------------------------------
  // Workspace member sync
  // ---------------------------------------------------------------------------

  protected async syncSlackWorkspaceMembers(
    supabase: SupabaseClient,
    userId: string,
    botToken: string,
    orgId: string | null,
  ): Promise<void> {
    const members = await this.slackApi.listUsers(botToken)
    const realMembers = members.filter((m) => !m.deleted && m.id !== 'USLACKBOT')
    if (realMembers.length === 0) return

    let synced = 0
    for (const member of realMembers) {
      const displayName = member.profile?.display_name || member.real_name || member.name || ''
      try {
        await this.slackRuntimeRepo.upsertChannelMember(supabase, {
          user_id: userId,
          org_id: orgId,
          platform: 'slack',
          platform_id: member.id,
          display_name: displayName,
          username: member.name ?? null,
          avatar_url: member.profile?.image_72 ?? null,
          title: member.profile?.title ?? null,
          timezone: member.tz ?? null,
          is_bot: member.is_bot ?? false,
        })
        synced++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.logger.warn(`Failed to upsert Slack member ${member.id}: ${message}`)
      }
    }
    this.logger.log(`Synced ${synced}/${realMembers.length} Slack workspace members`)
  }

  protected async buildChannelContext(
    supabase: SupabaseClient,
    userId: string,
    botToken: string,
    channelId: string,
    identity?: { orgId?: string | null; slackTeamId?: string | null },
  ): Promise<string> {
    const sections: string[] = []
    if (identity?.orgId && identity.slackTeamId) {
      const identityBlock = await this.buildSlackAskIdentityBlock(supabase, {
        orgId: identity.orgId,
        slackTeamId: identity.slackTeamId,
        channelId,
        botToken,
      }).catch((error) => {
        this.logger.warn(
          `Failed to build Slack channel identity: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
        return ''
      })
      if (identityBlock) sections.push(identityBlock)
    }

    const messages = await this.slackApi.getChannelHistory(botToken, channelId, 10)
    const relevant = messages.filter((m) => !m.bot_id && m.text).reverse()
    if (relevant.length === 0) return sections.join('\n\n')

    const userIds = [...new Set(relevant.map((m) => m.user).filter(Boolean))] as string[]
    const nameMap = new Map<string, string>()
    for (const uid of userIds) {
      const displayName = await this.slackRuntimeRepo.findChannelMemberDisplayName(
        supabase,
        userId,
        uid,
      )
      nameMap.set(uid, displayName || uid)
    }

    const lines = ['[Recent channel discussion]']
    for (const msg of relevant) {
      const name = nameMap.get(msg.user ?? '') ?? msg.user ?? 'unknown'
      const cleanText = (msg.text ?? '').replace(/<@[A-Z0-9]+>/g, (match) => {
        const id = match.slice(2, -1)
        return `@${nameMap.get(id) ?? id}`
      })
      lines.push(`@${name}: ${cleanText}`)
    }
    sections.push(lines.join('\n'))
    return sections.join('\n\n')
  }

  protected async buildSlackAskIdentityBlock(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelId: string
      botToken?: string
      channelNameHint?: string | null
    },
  ): Promise<string> {
    const stamp = await this.resolveSlackAskClientStamp(supabase, input)
    if (!stamp) return ''
    return formatSlackAskIdentityContext(stamp)
  }

  protected async resolveSlackAskClientStamp(
    supabase: SupabaseClient,
    input: {
      orgId: string
      slackTeamId: string
      channelId: string
      botToken?: string
      channelNameHint?: string | null
    },
  ): Promise<SlackAskClientStamp | null> {
    const { data: channel } = await supabase
      .from('slack_observation_channels')
      .select('channel_name')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_id', input.channelId)
      .maybeSingle()

    const { data: event } = await supabase
      .from('slack_observation_events')
      .select('channel_name, metadata')
      .eq('org_id', input.orgId)
      .eq('slack_team_id', input.slackTeamId)
      .eq('channel_id', input.channelId)
      .not('metadata->>page_grader_client_id', 'is', null)
      .order('observed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const metadata =
      event?.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
        ? (event.metadata as Record<string, unknown>)
        : {}
    const asString = (value: unknown) =>
      typeof value === 'string' && value.trim() ? value.trim() : null

    let channelName =
      asString(input.channelNameHint) ??
      asString(channel?.channel_name) ??
      asString(event?.channel_name)

    if (!channelName && input.botToken) {
      channelName = await this.slackApi
        .getConversationName(input.botToken, input.channelId)
        .catch(() => null)
    }

    const pageGraderClientId = asString(metadata.page_grader_client_id)
    const pageGraderClientName = asString(metadata.page_grader_client_name)
    if (!channelName && !pageGraderClientId && !pageGraderClientName) return null

    return {
      channelId: input.channelId,
      channelName,
      pageGraderClientId,
      pageGraderClientName,
      roasCampaignId: asString(metadata.roas_campaign_id),
      roasCampaignName: asString(metadata.roas_campaign_name),
    }
  }
}
