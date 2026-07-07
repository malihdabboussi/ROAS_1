import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Optional,
  Post,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Response } from 'express'
import { SyncReadyInterceptor } from '../../agent-sync/interceptors/sync-ready.interceptor'
import { AnthropicClaudeAdminAuthService } from '../../chat/services/anthropic-claude-admin-auth.service'
import { OpenAICodexAdminAuthService } from '../../chat/services/openai-codex-admin-auth.service'
import {
  isAnthropicClaudeSubscriptionGatewayModel,
  isOpenAICodexGatewayModel,
  resolveGatewayModel,
} from '../../chat/services/openclaw-model-routing'
import { InternalAuthGuard } from '../guards/internal-auth.guard'
import { ArtifactsService } from '../services/artifacts.service'
import { MissionContextEnricherService } from '../services/mission-context-enricher.service'

@Controller('artifacts/openclaw')
@UseGuards(InternalAuthGuard, ThrottlerGuard)
@UseInterceptors(SyncReadyInterceptor)
export class ArtifactOpenClawProxyController {
  constructor(
    private readonly artifactsService: ArtifactsService,
    private readonly missionContextEnricher: MissionContextEnricherService,
    @Optional()
    private readonly anthropicClaudeAdminAuth?: AnthropicClaudeAdminAuthService,
    @Optional()
    private readonly openAICodexAdminAuth?: OpenAICodexAdminAuthService,
  ) {}

  @Post('chat-completions')
  @HttpCode(HttpStatus.OK)
  async proxyOpenClawChatCompletions(
    @Body() body: Record<string, unknown>,
    @Headers('x-openclaw-session-key') sessionKey: string | undefined,
    @Headers('x-openclaw-agent-id') gatewayAgentId: string | undefined,
    @Headers('x-org-id') orgIdHeader: string | undefined,
  ) {
    const metadata = body.metadata as Record<string, unknown> | undefined
    await this.artifactsService.assertCreditsForSession(sessionKey, metadata)
    return this.artifactsService.proxyOpenClawChatCompletions(
      body,
      sessionKey ?? '',
      gatewayAgentId ?? '',
      orgIdHeader,
    )
  }

  @Post('responses')
  async proxyOpenClawResponses(
    @Body() body: Record<string, unknown>,
    @Headers('x-openclaw-session-key') sessionKey: string | undefined,
    @Headers('x-openclaw-agent-id') gatewayAgentId: string | undefined,
    @Headers('x-correlation-id') correlationIdHeader: string | undefined,
    @Headers('x-mission-id') missionIdHeader: string | undefined,
    @Headers('x-campaign-id') campaignIdHeader: string | undefined,
    @Headers('x-subtask-id') subtaskIdHeader: string | undefined,
    @Headers('x-org-id') orgIdHeader: string | undefined,
    @Headers('x-openclaw-identity-suffix') identitySuffixHeader: string | undefined,
    @Headers('sentry-trace') sentryTrace: string | undefined,
    @Headers('baggage') baggage: string | undefined,
    @Res() res: Response,
  ) {
    const metadata = body.metadata as Record<string, unknown> | undefined
    const userId = typeof metadata?.user_id === 'string' ? metadata.user_id : ''
    const agentKey = typeof metadata?.agent_key === 'string' ? metadata.agent_key : 'vibey'
    await this.applySubscriptionRuntimeCredentials(body, userId, gatewayAgentId ?? agentKey)
    await this.artifactsService.assertCreditsForSession(sessionKey, metadata, orgIdHeader)
    if (typeof missionIdHeader === 'string' && missionIdHeader.trim()) {
      const rawCampaign = metadata?.campaign_id ?? campaignIdHeader
      const campaignId =
        typeof rawCampaign === 'string' && rawCampaign.trim() ? rawCampaign.trim() : null
      const rawOrgId = metadata?.org_id ?? orgIdHeader
      const orgId = typeof rawOrgId === 'string' && rawOrgId.trim() ? rawOrgId.trim() : null
      await this.missionContextEnricher.enrichMissionBody(body, userId, agentKey, campaignId, orgId)
    }
    const hop = {
      correlationId: correlationIdHeader,
      missionId: missionIdHeader,
      subtaskId: subtaskIdHeader,
      orgId: orgIdHeader,
      identitySuffix: identitySuffixHeader,
    }
    const upstreamTrace: { sentryTrace?: string; baggage?: string } = {}
    if (typeof sentryTrace === 'string' && sentryTrace.trim()) {
      upstreamTrace.sentryTrace = sentryTrace.trim()
    }
    if (typeof baggage === 'string' && baggage.trim()) {
      upstreamTrace.baggage = baggage.trim()
    }
    if (body.stream === true) {
      await this.artifactsService.proxyOpenClawResponsesStream(
        res,
        body,
        sessionKey ?? '',
        gatewayAgentId ?? '',
        hop,
        upstreamTrace,
      )
      return
    }
    const data = await this.artifactsService.proxyOpenClawResponses(
      body,
      sessionKey ?? '',
      gatewayAgentId ?? '',
      hop,
      upstreamTrace,
    )
    res.status(HttpStatus.OK).json(data)
  }

  private async applySubscriptionRuntimeCredentials(
    body: Record<string, unknown>,
    userId: string,
    gatewayAgentId: string,
  ): Promise<void> {
    const model = typeof body.model === 'string' ? body.model.trim() : ''
    if (!model) return

    const resolvedModel = this.resolveSubscriptionGatewayModel(model, gatewayAgentId)
    if (resolvedModel !== model) {
      body.model = resolvedModel
    }

    if (Array.isArray(body.runtime_credentials) && body.runtime_credentials.length > 0) {
      return
    }

    if (isOpenAICodexGatewayModel(resolvedModel)) {
      const credential = await this.openAICodexAdminAuth?.resolveRuntimeCredential(userId)
      if (!credential) {
        throw new BadRequestException(
          'OpenAI Codex subscription is not connected for this admin account',
        )
      }
      body.runtime_credentials = [
        { provider: credential.provider, access_token: credential.accessToken },
      ]
      return
    }

    if (isAnthropicClaudeSubscriptionGatewayModel(resolvedModel)) {
      const credential = await this.anthropicClaudeAdminAuth?.resolveRuntimeCredential(userId)
      if (!credential) {
        throw new BadRequestException('Claude subscription is not connected for this admin account')
      }
      body.runtime_credentials = [
        { provider: credential.provider, access_token: credential.accessToken },
      ]
    }
  }

  private resolveSubscriptionGatewayModel(model: string, gatewayAgentId: string): string {
    const normalized = this.stripOpenRouterPrefixFromSubscriptionModel(model)
    const lower = normalized.toLowerCase()
    if (
      lower.startsWith('openai-codex/') ||
      lower.startsWith('anthropic-subscription/') ||
      lower === 'gpt-5.3-codex' ||
      lower.startsWith('gpt-5.3-codex-') ||
      lower === 'gpt-5.5-codex' ||
      lower.startsWith('gpt-5.5-codex-') ||
      lower.startsWith('openai/gpt-5.3-codex') ||
      lower.startsWith('openai/gpt-5.5-codex')
    ) {
      return resolveGatewayModel(normalized, gatewayAgentId || 'vibey')
    }
    if (lower.startsWith('anthropic/claude-')) return normalized
    return model
  }

  private stripOpenRouterPrefixFromSubscriptionModel(model: string): string {
    let normalized = model.trim()
    while (normalized.startsWith('openrouter/openrouter/')) {
      normalized = normalized.replace(/^openrouter\//, '')
    }
    const lower = normalized.toLowerCase()
    if (lower.startsWith('openrouter/openai-codex/')) {
      return normalized.slice('openrouter/'.length)
    }
    if (lower.startsWith('openrouter/anthropic-subscription/')) {
      return normalized.slice('openrouter/'.length)
    }
    return normalized
  }
}
