import { randomUUID } from 'crypto'
import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UserSessionMintService } from '@vibey/api-shared'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { UserAgentApiService } from '../../user-agent-api/services/user-agent-api.service'
import { isSlackAuthError, SlackApiIntegration } from '../integrations/slack-api.integration'
import { SlackRuntimeRepository } from '../repositories/slack-runtime.repository'
import { SlackRepository } from '../repositories/slack.repository'
import type { SlackEventEnvelope, SlackWorkspaceChannel } from '../types/slack.types'
import { SlackAccessControlService } from './slack-access-control.service'
import { getSlackSearchCapability } from './slack-search-capability'
import { SlackEventsBase } from './slack-service-events.base'

@Injectable()
export class SlackService extends SlackEventsBase {
  constructor(
    slackApi: SlackApiIntegration,
    slackRepo: SlackRepository,
    slackRuntimeRepo: SlackRuntimeRepository,
    config: ConfigService,
    userSessionMint: UserSessionMintService,
    documentExtraction: DocumentExtractionService,
    userAgentApi: UserAgentApiService,
    slackAccessControl: SlackAccessControlService,
    private readonly moduleRef: ModuleRef,
  ) {
    super(
      slackApi,
      slackRepo,
      slackRuntimeRepo,
      config,
      userSessionMint,
      documentExtraction,
      userAgentApi,
      slackAccessControl,
    )
    this.titleModuleRef = moduleRef
  }
  protected async processEventAsync(envelope: SlackEventEnvelope): Promise<void> {
    if (envelope.team_id && envelope.event) {
      await this.captureObservationEvent(envelope.team_id, envelope.event)
    }
    await super.processEventAsync(envelope)
  }
  protected async handleMessageEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    const channelId = String(event.channel ?? '').trim()
    const threadTs = String(event.thread_ts ?? '').trim()
    const text = String(event.text ?? '').trim()
    const slackUserId = String(event.user ?? '').trim()
    let nextEvent = event
    if (channelId && threadTs && text && slackUserId) {
      const { SlackInboundThreadEnrichmentService } =
        await import('./slack-inbound-thread-enrichment.service')
      const enricher = this.moduleRef.get(SlackInboundThreadEnrichmentService, { strict: false })
      if (enricher) {
        const enriched = await enricher.enrich({
          supabase: this.getServiceRoleClient(),
          teamId,
          channelId,
          threadTs,
          text,
          slackUserId,
        })
        if (enriched.handled) return
        if (enriched.text !== text) nextEvent = { ...event, text: enriched.text }
      }
    }
    await super.handleMessageEvent(teamId, nextEvent)
  }

  private async captureObservationEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    try {
      const { SlackObservationService } = await import('./slack-observation.service')
      const observation = this.moduleRef.get(SlackObservationService, { strict: false })
      if (!observation) return
      await observation.recordWebhookEvent({
        supabase: this.getServiceRoleClient(),
        slackTeamId: teamId,
        event,
      })
    } catch (error) {
      this.logger.warn(
        `Slack observation capture failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  protected async handleReactionAddedEvent(
    teamId: string,
    event: NonNullable<SlackEventEnvelope['event']>,
  ): Promise<void> {
    const channelId = String(event.item?.channel ?? event.channel ?? '').trim()
    const messageTs = String(event.item?.ts ?? '').trim()
    const reaction = String(event.reaction ?? '').trim()
    const slackUserId = String(event.user ?? '').trim()
    if (!channelId || !messageTs || !reaction || !slackUserId) return

    this.logger.log(
      `[TRACE] handleReactionAddedEvent: team=${teamId} channel=${channelId} ts=${messageTs} reaction=${reaction}`,
    )

    try {
      const { MeetingFollowUpSlackConfirmService } =
        await import('../../spaces/services/meeting-follow-up-slack-confirm.service')
      const confirm = this.moduleRef.get(MeetingFollowUpSlackConfirmService, { strict: false })
      if (!confirm) return
      const handled = await confirm.handleReactionAdded({
        channelId,
        messageTs,
        reaction,
        slackUserId,
      })
      if (handled) {
        this.logger.log(`[TRACE] handleReactionAddedEvent: meeting follow-up confirm handled`)
      }
    } catch (err) {
      this.logger.warn(
        `handleReactionAddedEvent confirm lookup failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth

  getInstallUrl(
    userId: string,
    agentKey: string,
    userAccessToken?: string,
    userRefreshToken?: string,
    returnTo?: string,
    orgId?: string | null,
  ): { url: string } {
    const clientId = process.env.SLACK_CLIENT_ID
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI
    if (!clientId || !redirectUri)
      throw new Error('Missing SLACK_CLIENT_ID or SLACK_OAUTH_REDIRECT_URI')

    const nonce = randomUUID()

    if (userAccessToken) {
      this.pendingInstalls.set(nonce, {
        accessToken: userAccessToken,
        refreshToken: userRefreshToken ?? null,
        ts: Date.now(),
      })
      Promise.resolve()
        .then(() =>
          this.persistCanonicalSupabaseTokens(
            this.getServiceRoleClient(),
            userId,
            userAccessToken,
            userRefreshToken ?? null,
            orgId ?? null,
          ),
        )
        .catch((err) =>
          this.logger.warn(`Failed to persist canonical Slack Supabase tokens: ${err}`),
        )
      this.cleanupPendingInstalls()
    }

    const state = this.encodeOAuthState({
      user_id: userId,
      agent_key: agentKey,
      ts: Date.now(),
      nonce,
      return_to: returnTo,
      org_id: orgId ?? null,
    })

    const botScopes = [
      'app_mentions:read',
      'assistant:write',
      'bookmarks:read',
      'bookmarks:write',
      'channels:history',
      'channels:join',
      'channels:read',
      'chat:write',
      'chat:write.public',
      'commands',
      'files:read',
      'files:write',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'im:write',
      'links:read',
      'links:write',
      'mpim:history',
      'mpim:read',
      'mpim:write',
      'reactions:read',
      'reactions:write',
      'remote_files:read',
      'users:read',
      'users:read.email',
    ]

    // search.* Web API methods require a user token (xoxp). Request via user_scope.
    const userScopes = [
      'search:read',
      'search:read.files',
      'search:read.im',
      'search:read.mpim',
      'search:read.private',
      'search:read.public',
    ]

    const qs = new URLSearchParams({
      client_id: clientId,
      scope: botScopes.join(','),
      user_scope: userScopes.join(','),
      redirect_uri: redirectUri,
      state,
    })
    return { url: `https://slack.com/oauth/v2/authorize?${qs.toString()}` }
  }

  async handleOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ html: string; redirectUrl?: string }> {
    const clientId = process.env.SLACK_CLIENT_ID
    const clientSecret = process.env.SLACK_CLIENT_SECRET
    const redirectUri = process.env.SLACK_OAUTH_REDIRECT_URI
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error(
        'Missing one of: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_OAUTH_REDIRECT_URI',
      )
    }

    const statePayload = this.decodeOAuthState(state)
    const serviceSupabase = this.getServiceRoleClient()
    const oauth = await this.slackApi.oauthAccess(clientId, clientSecret, code, redirectUri)

    const botToken = oauth.access_token
    const teamId = oauth.team?.id
    const teamName = oauth.team?.name
    const botUserId = oauth.bot_user_id
    if (!botToken || !teamId) throw new Error('Slack OAuth did not return bot token/team id')

    await this.slackRepo.disconnectSlackForTeamOnOtherOrgs(
      serviceSupabase,
      statePayload.user_id,
      teamId,
      statePayload.org_id ?? null,
    )

    await this.slackRepo.saveIntegration(
      serviceSupabase,
      statePayload.user_id,
      botToken,
      {
        app_id: oauth.app_id ?? null,
        scope: oauth.scope ?? null,
        token_type: oauth.token_type ?? null,
        team_id: teamId,
        team_name: teamName ?? null,
        bot_user_id: botUserId ?? null,
        authed_user_id: oauth.authed_user?.id ?? null,
        authed_user_scope: oauth.authed_user?.scope ?? null,
        // Required for search.messages / search.files (bot tokens cannot call those APIs).
        ...(typeof oauth.authed_user?.access_token === 'string' &&
        oauth.authed_user.access_token.trim()
          ? { user_access_token: oauth.authed_user.access_token.trim() }
          : {}),
        installed_for_agent_key: statePayload.agent_key,
      },
      statePayload.org_id ?? null,
    )

    const pendingTokens = this.pendingInstalls.get(statePayload.nonce)
    this.pendingInstalls.delete(statePayload.nonce)

    if (pendingTokens?.accessToken) {
      await this.persistCanonicalSupabaseTokens(
        serviceSupabase,
        statePayload.user_id,
        pendingTokens.accessToken,
        pendingTokens.refreshToken,
        statePayload.org_id ?? null,
      ).catch((err) =>
        this.logger.warn(`Failed to persist canonical Slack Supabase tokens from callback: ${err}`),
      )
    }

    if (pendingTokens?.accessToken) {
      this.autoCreateDefaultChannel(
        serviceSupabase,
        statePayload.user_id,
        statePayload.agent_key,
        teamId,
        teamName ?? null,
        botToken,
        botUserId ?? null,
        oauth.app_id ?? null,
        oauth.scope ?? null,
        oauth.authed_user?.id ?? null,
        pendingTokens.accessToken,
        pendingTokens.refreshToken,
        statePayload.org_id ?? null,
      ).catch((err) => this.logger.warn(`Failed to auto-create default Slack channel: ${err}`))
    }

    this.sendWelcomeDm(botToken, oauth.authed_user?.id).catch((err) =>
      this.logger.warn(`Failed to send Slack welcome DM: ${err}`),
    )

    this.syncSlackWorkspaceMembers(
      serviceSupabase,
      statePayload.user_id,
      botToken,
      statePayload.org_id ?? null,
    ).catch((err) => this.logger.warn(`Failed to sync Slack workspace members: ${err}`))

    return {
      html: `<html><body style="font-family:sans-serif;padding:24px;text-align:center"><h2>Slack connected</h2><p>This window will close automatically&hellip;</p><script>window.close()</script></body></html>`,
    }
  }

  private async autoCreateDefaultChannel(
    serviceSupabase: SupabaseClient,
    userId: string,
    agentKey: string,
    teamId: string,
    teamName: string | null,
    botToken: string,
    botUserId: string | null,
    appId: string | null,
    scope: string | null,
    authedUserId: string | null,
    userAccessToken: string,
    userRefreshToken: string | null,
    orgId?: string | null,
  ): Promise<void> {
    const providerConfig = {
      team_id: teamId,
      team_name: teamName,
      bot_user_id: botUserId,
      bot_token: botToken,
      channel_id: '__dm__',
      channel_name: 'Direct Messages',
      app_id: appId,
      scope,
      authed_user_id: authedUserId,
      user_access_token: userAccessToken,
      user_refresh_token: userRefreshToken,
    }

    const existing = await this.slackRepo.findChannelByAgentKey(
      serviceSupabase,
      userId,
      agentKey,
      orgId,
    )
    if (existing) {
      await this.slackRepo.updateChannel(serviceSupabase, userId, existing.id, {
        provider_config: providerConfig,
        is_active: true,
        error_message: null,
      })
      return
    }

    await this.slackRepo.createChannel(serviceSupabase, {
      user_id: userId,
      agent_key: agentKey,
      channel_type: 'slack',
      provider_config: providerConfig,
      org_id: orgId ?? null,
    })
  }

  private cleanupPendingInstalls(): void {
    const now = Date.now()
    for (const [nonce, data] of this.pendingInstalls.entries()) {
      if (now - data.ts > this.eventDedupeTtlMs) this.pendingInstalls.delete(nonce)
    }
  }

  // Status / channel management
  async getStatus(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) {
      return { success: true, connected: false, status: null, teamName: null, connectedAt: null }
    }
    const metadata = integration.metadata as Record<string, unknown>
    return {
      success: true,
      connected: true,
      status: 'connected',
      teamName: typeof metadata.team_name === 'string' ? metadata.team_name : null,
      teamId: typeof metadata.team_id === 'string' ? metadata.team_id : null,
      connectedAt: typeof metadata.connected_at === 'string' ? metadata.connected_at : null,
      searchCapability: getSlackSearchCapability(metadata),
    }
  }

  async disconnect(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    await this.slackRuntimeRepo.disconnectIntegration(supabase, userId, orgId)
  }

  async remove(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    await this.slackRepo.deleteAllChannelsForUser(supabase, userId, orgId)
    await this.slackRepo.deleteIntegration(supabase, userId, orgId)
  }

  async listWorkspaceChannels(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<SlackWorkspaceChannel[]> {
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) throw new Error('Slack is not connected for this user')
    try {
      return await this.slackApi.listConversations(integration.access_token)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg === 'missing_scope') {
        throw new BadRequestException(
          'Slack app is missing required permissions. Please reinstall the Slack integration in Settings.',
        )
      }
      if (isSlackAuthError(err)) {
        await this.slackRepo
          .markIntegrationError(supabase, userId, err.slackError, orgId)
          .catch((markErr) =>
            this.logger.warn(`Failed to mark Slack integration auth error: ${markErr}`),
          )
        throw new BadRequestException('Slack needs reconnecting. Reconnect Slack in Settings.')
      }
      throw err
    }
  }

  async mapAgentChannel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    channelId: string,
    channelName: string,
    userAccessToken: string,
    userRefreshToken?: string,
    orgId?: string | null,
  ): Promise<{ channel_id: string; channel_name: string }> {
    if (!userAccessToken) throw new Error('Missing user access token')
    const integration = await this.slackRepo.getIntegration(supabase, userId, orgId)
    if (!integration?.access_token) throw new Error('Slack is not connected for this user')

    const metadata = integration.metadata as Record<string, unknown>
    const teamId = typeof metadata.team_id === 'string' ? metadata.team_id : null
    if (!teamId) throw new Error('Slack integration missing team id')

    const existing = await this.slackRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    const providerConfig = {
      team_id: teamId,
      team_name: typeof metadata.team_name === 'string' ? metadata.team_name : null,
      bot_user_id: typeof metadata.bot_user_id === 'string' ? metadata.bot_user_id : null,
      bot_token: integration.access_token,
      channel_id: channelId,
      channel_name: channelName,
      app_id: typeof metadata.app_id === 'string' ? metadata.app_id : null,
      scope: typeof metadata.scope === 'string' ? metadata.scope : null,
      authed_user_id: typeof metadata.authed_user_id === 'string' ? metadata.authed_user_id : null,
      user_access_token: userAccessToken,
      user_refresh_token: userRefreshToken ?? null,
    }

    if (existing) {
      await this.slackRepo.updateChannel(supabase, userId, existing.id, {
        provider_config: providerConfig,
        is_active: true,
        error_message: null,
      })
      await this.persistCanonicalSupabaseTokens(
        supabase,
        userId,
        userAccessToken,
        userRefreshToken ?? null,
        orgId,
      ).catch((err) =>
        this.logger.warn(
          `Failed to persist canonical Slack Supabase tokens after channel update: ${err}`,
        ),
      )
      return { channel_id: existing.id, channel_name: channelName }
    }

    const channel = await this.slackRepo.createChannel(supabase, {
      user_id: userId,
      agent_key: agentKey,
      channel_type: 'slack',
      provider_config: providerConfig,
      org_id: orgId ?? null,
    })
    await this.persistCanonicalSupabaseTokens(
      supabase,
      userId,
      userAccessToken,
      userRefreshToken ?? null,
      orgId,
    ).catch((err) =>
      this.logger.warn(
        `Failed to persist canonical Slack Supabase tokens after channel create: ${err}`,
      ),
    )
    return { channel_id: channel.id, channel_name: channelName }
  }

  async disconnectAgent(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    orgId?: string | null,
  ) {
    await this.slackRepo.deleteChannel(supabase, userId, agentKey, orgId)
  }

  async listChannels(supabase: SupabaseClient, userId: string, orgId?: string | null) {
    return this.slackRepo.listChannelsByUser(supabase, userId, orgId)
  }

  async toggleChannel(
    supabase: SupabaseClient,
    userId: string,
    agentKey: string,
    isActive: boolean,
    orgId?: string | null,
  ) {
    const channel = await this.slackRepo.findChannelByAgentKey(supabase, userId, agentKey, orgId)
    if (!channel) throw new Error('Slack channel not found')
    return this.slackRepo.updateChannel(supabase, userId, channel.id, { is_active: isActive })
  }

  // ---------------------------------------------------------------------------
  // Webhook: validate sync; caller runs returned Promise via Vercel waitUntil after HTTP 200.

  beginEventsWebhookProcessing(params: {
    signature: string | undefined
    timestamp: string | undefined
    rawBody: Buffer | undefined
    body: SlackEventEnvelope
  }): Promise<void> | null {
    const signingSecret = process.env.SLACK_SIGNING_SECRET
    if (!signingSecret) throw new Error('Missing SLACK_SIGNING_SECRET')
    if (!params.signature || !params.timestamp || !params.rawBody) {
      throw new Error('Missing Slack signature headers or raw body')
    }
    const valid = this.slackApi.verifyRequestSignature(
      params.rawBody,
      params.timestamp,
      params.signature,
      signingSecret,
    )
    if (!valid) throw new Error('Invalid Slack request signature')

    const envelope = params.body
    if (envelope.type !== 'event_callback') {
      this.logger.warn(
        `[TRACE] handleEventsWebhook EXIT: envelope.type=${envelope.type} (not event_callback)`,
      )
      return null
    }
    if (!envelope.event_id) {
      this.logger.warn(`[TRACE] handleEventsWebhook EXIT: missing event_id`)
      return null
    }
    if (this.isDuplicateEvent(envelope.event_id)) {
      this.logger.warn(`[TRACE] handleEventsWebhook EXIT: duplicate event_id=${envelope.event_id}`)
      return null
    }

    this.logger.log(
      `[TRACE] handleEventsWebhook PASS: event_id=${envelope.event_id} team_id=${envelope.team_id} event_type=${envelope.event?.type}`,
    )

    return this.processEventAsync(envelope)
  }
}
