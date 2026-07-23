import { Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatScopeKind } from '@vibey/api-shared'
import { isChatTimingLogsEnabled } from '../../../lib/debug/chat-timing-logs'
import { RequestContextService } from '../../shared/services/request-context.service'
import { ChatAccessTokenService } from './chat-access-token.service'
import type { ChatModelSettings } from './chat-model-input.service'
import {
  ChatPrewarmContextService,
  type PrewarmChatContextOptions,
} from './chat-prewarm-context.service'
import { ChatSetupEventsService, type CompletedPlatformTool } from './chat-setup-events.service'
import { ChatStreamMirrorService, type ChatStreamMirrorState } from './chat-stream-mirror.service'
import type { SendFn } from './openclaw-proxy.service'

type DbOperation = <T>(operation: (supabase: SupabaseClient) => Promise<T>) => Promise<T>
export interface ChatTurnTimingSpan {
  name: string
  started_at_ms: number
  ended_at_ms: number
  duration_ms: number
  metadata?: Record<string, unknown>
}
export type RecordChatTurnTimingSpan = (
  name: string,
  startedAtMs: number,
  metadata?: Record<string, unknown>,
) => void
type RunPlatformTool = <T>(
  options: {
    name: string
    action: string
    labels: readonly string[]
    seed: string
    id: string
  },
  operation: () => Promise<T>,
) => Promise<T>

interface ChannelUser {
  platform_id: string
  username?: string
  display_name: string
  language?: string
  relationship_kind?: 'internal'
  is_connection_owner?: boolean
  personal_brain_access?: boolean
}

interface MessageScope {
  space_id: string | null
  campaign_id: string | null
  scope_kind: ChatScopeKind | 'unknown'
  org_id: string | null
}

interface CreateTurnSessionInput {
  supabase: SupabaseClient
  conversationId: string
  agentKey?: string
  model?: string
  modelSettings?: ChatModelSettings
  userId: string
  accessToken: string
  refreshToken?: string
  campaignId?: string | null
  spaceId?: string | null
  scopeKind?: ChatScopeKind
  orgId?: string
  source?: string
  channelUser?: ChannelUser
  documentsLength: number
  highlightedArtifactCount: number
  messageReferenceCount: number
  hidden: boolean
  timingSpans?: ChatTurnTimingSpan[]
  send: SendFn
  logger: Logger
}

interface RequestContextRefreshState {
  conversationId: string
  userId: string
  campaignId: string | null
  selectedModelInput: string | null
  orgId?: string | null
  resolvedChannel: 'telegram' | 'slack' | 'studio'
  channelUser?: ChannelUser
  messageScope: MessageScope
}

export interface ChatTurnSession {
  chatDiag: string
  streamStartedAt: number
  chatTimingLogsEnabled: boolean
  prewarmCacheKey: string | null
  streamMirrorService: ChatStreamMirrorService
  streamMirrorState: ChatStreamMirrorState
  completedPlatformTools: CompletedPlatformTool[]
  dbOp: DbOperation
  getDbSupabase: () => SupabaseClient
  getCurrentAccessToken: () => string
  getCurrentRefreshToken: () => string | null
  getPrewarmOptions: () => PrewarmChatContextOptions
  refreshIfNearExpiry: () => Promise<void>
  setRequestContextRefreshState: (state: RequestContextRefreshState) => void
  logChatFlow: (message: string) => void
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  recordTimingSpan: RecordChatTurnTimingSpan
  getTimingSpans: () => ChatTurnTimingSpan[]
  sendPreRunEvent: (type: string, payload: Record<string, unknown>) => Promise<void>
  sendSetupStatus: (message: string) => Promise<void>
  runPlatformTool: RunPlatformTool
}

@Injectable()
export class ChatTurnSessionService {
  constructor(
    private readonly accessTokenService: ChatAccessTokenService,
    private readonly prewarmContextService: ChatPrewarmContextService,
    private readonly setupEventsService: ChatSetupEventsService,
    private readonly streamMirrorService: ChatStreamMirrorService,
    private readonly requestContext: RequestContextService,
  ) {}

  create(input: CreateTurnSessionInput): ChatTurnSession {
    let dbSupabase = input.supabase
    let currentAccessToken = input.accessToken
    let currentRefreshToken = input.refreshToken?.trim().length ? input.refreshToken.trim() : null
    let requestContextRefreshState: RequestContextRefreshState | null = null
    const chatDiag = `conversationId=${input.conversationId} userId=${input.userId} campaignId=${input.campaignId ?? 'none'}`
    const streamStartedAt = Date.now()
    const timingSpans: ChatTurnTimingSpan[] = [...(input.timingSpans ?? [])]
    const recordTimingSpan: RecordChatTurnTimingSpan = (name, startedAtMs, metadata) => {
      const endedAtMs = Date.now()
      timingSpans.push({
        name,
        started_at_ms: startedAtMs,
        ended_at_ms: endedAtMs,
        duration_ms: Math.max(0, endedAtMs - startedAtMs),
        ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
      })
    }
    const chatTimingLogsEnabled = isChatTimingLogsEnabled()
    const logChatFlow = (message: string): void => {
      if (!chatTimingLogsEnabled) return
      input.logger.log(message)
    }
    const prewarmCacheKey = this.prewarmContextService.createPrewarmCacheKey(
      this.buildPrewarmOptions(input),
    )
    const logChatTiming = (stage: string, extra?: Record<string, unknown>): void => {
      if (!chatTimingLogsEnabled) return
      input.logger.log(
        JSON.stringify({
          feature: 'chat_pre_stream_timing_v1',
          stage,
          latency_ms: Date.now() - streamStartedAt,
          conversation_id: input.conversationId,
          user_id: input.userId,
          org_id: input.orgId ?? null,
          campaign_id: input.campaignId ?? null,
          source: input.source ?? 'studio',
          prewarm_cache_key_present: Boolean(prewarmCacheKey),
          ...(extra ?? {}),
        }),
      )
    }
    logChatFlow(`[ChatFlow] process_start ${chatDiag}`)
    logChatTiming('process_start', {
      has_documents: input.documentsLength > 0,
      document_count: input.documentsLength,
      highlighted_artifact_count: input.highlightedArtifactCount,
      message_reference_count: input.messageReferenceCount,
      hidden: input.hidden === true,
    })

    const shadowStreamVerifyEnabled = ['1', 'true', 'on', 'yes'].includes(
      (process.env.CHAT_STREAM_SHADOW_VERIFY ?? '').toLowerCase(),
    )
    const streamMirrorState = this.streamMirrorService.createState({
      enabled: shadowStreamVerifyEnabled,
      diagnostic: chatDiag,
    })
    const sendPreRunEvent = async (type: string, payload: Record<string, unknown>): Promise<void> =>
      this.streamMirrorService.sendPreRunEvent(streamMirrorState, type, payload, input.send)
    const sendSetupStatus = async (message: string): Promise<void> => {
      await sendPreRunEvent('status', {
        phase: 'thinking',
        message: this.setupEventsService.bucketSetupStatusMessage(message),
      })
    }
    const completedPlatformTools: CompletedPlatformTool[] = []
    const runPlatformTool: RunPlatformTool = async (options, operation) =>
      this.setupEventsService.runPlatformTool({
        ...options,
        completedPlatformTools,
        sendPreRunEvent,
        operation,
      })

    const refreshDbAuth = async (): Promise<void> => {
      if (!currentRefreshToken) throw new Error('Missing refresh token')
      const refreshed = await this.accessTokenService.refreshAccessToken(currentRefreshToken)
      currentAccessToken = refreshed.accessToken
      currentRefreshToken = refreshed.refreshToken ?? currentRefreshToken
      dbSupabase = this.accessTokenService.createRlsClient(currentAccessToken)
    }
    const dbOp: DbOperation = async (operation) => {
      try {
        return await operation(dbSupabase)
      } catch (err) {
        if (currentRefreshToken && this.accessTokenService.isJwtExpiredDbError(err)) {
          await refreshDbAuth()
          if (requestContextRefreshState) {
            this.refreshRequestContext(
              requestContextRefreshState,
              currentAccessToken,
              currentRefreshToken,
            )
          }
          return await operation(dbSupabase)
        }
        throw err
      }
    }
    const refreshIfNearExpiry = async (): Promise<void> => {
      if (
        currentRefreshToken &&
        this.accessTokenService.isJwtExpiredOrNearExpiry(currentAccessToken, 60)
      ) {
        await refreshDbAuth()
      }
    }

    return {
      chatDiag,
      streamStartedAt,
      chatTimingLogsEnabled,
      prewarmCacheKey,
      streamMirrorService: this.streamMirrorService,
      streamMirrorState,
      completedPlatformTools,
      dbOp,
      getDbSupabase: () => dbSupabase,
      getCurrentAccessToken: () => currentAccessToken,
      getCurrentRefreshToken: () => currentRefreshToken,
      getPrewarmOptions: () => ({
        ...this.buildPrewarmOptions(input),
        supabase: dbSupabase,
        accessToken: currentAccessToken,
        refreshToken: currentRefreshToken ?? undefined,
      }),
      refreshIfNearExpiry,
      setRequestContextRefreshState: (state) => {
        requestContextRefreshState = state
      },
      logChatFlow,
      logChatTiming,
      recordTimingSpan,
      getTimingSpans: () => structuredClone(timingSpans),
      sendPreRunEvent,
      sendSetupStatus,
      runPlatformTool,
    }
  }

  private refreshRequestContext(
    state: RequestContextRefreshState,
    currentAccessToken: string,
    currentRefreshToken: string | null,
  ): void {
    this.requestContext.set(
      state.conversationId,
      state.userId,
      state.campaignId,
      currentAccessToken,
      currentRefreshToken,
      state.selectedModelInput,
      state.orgId ?? null,
      state.resolvedChannel,
      state.channelUser
        ? {
            platform_id: state.channelUser.platform_id,
            display_name: state.channelUser.display_name,
            username: state.channelUser.username,
            relationship_kind: state.channelUser.relationship_kind,
            is_connection_owner: state.channelUser.is_connection_owner,
            personal_brain_access: state.channelUser.personal_brain_access,
          }
        : null,
      state.messageScope.space_id,
      state.messageScope.scope_kind,
    )
  }

  private buildPrewarmOptions(input: CreateTurnSessionInput): PrewarmChatContextOptions {
    return {
      supabase: input.supabase,
      conversationId: input.conversationId,
      agentKey: input.agentKey,
      model: input.model,
      modelSettings: input.modelSettings,
      userId: input.userId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      campaignId: input.campaignId,
      spaceId: input.spaceId,
      scopeKind: input.scopeKind,
      orgId: input.orgId,
      source: input.source,
    }
  }
}
