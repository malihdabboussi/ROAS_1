import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ChatRunEventStoreService } from './chat-run-event-store.service'
import type { ValidatedModelSettings } from './chat-model-input.service'
import { ChatStreamMirrorService, type ChatStreamMirrorState } from './chat-stream-mirror.service'
import type { CompletedPlatformTool } from './chat-setup-events.service'
import { MessageTimelineService } from './message-timeline.service'
import type { SendFn } from './openclaw-proxy.service'
import { StreamRegistryService } from './stream-registry.service'
import { TracingService } from './tracing.service'

type DbOperation = <T>(op: (client: SupabaseClient) => Promise<T>) => Promise<T>

interface StartAssistantTurnInput {
  chatDiag: string
  completedPlatformTools: CompletedPlatformTool[]
  content: string
  conversationId: string
  dbOp: DbOperation
  gatewayAgentId: string
  gatewayModelId: string
  historyLength: number
  instructions: string
  logChatFlow: (message: string) => void
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  logger: Logger
  messageId?: string
  requestId?: string | null
  orgId?: string | null
  resolvedAgentId: string
  resolvedCampaignId?: string | null
  resolvedChannel: 'telegram' | 'slack' | 'studio'
  runId?: string
  send: SendFn
  sendSetupStatus: (message: string) => Promise<void>
  selectedModelInput?: string | null
  selectedSettings?: ValidatedModelSettings
  sessionKey: string
  streamMirrorService: ChatStreamMirrorService
  streamMirrorState: ChatStreamMirrorState
  streamStartedAt: number
  userId: string
}

function resolveSubscriptionCredentialProvider(modelId: string | null | undefined): string | null {
  const normalized = (modelId ?? '').trim().toLowerCase()
  if (normalized.startsWith('openai-codex/')) return 'openai_codex'
  if (normalized.startsWith('anthropic-subscription/')) return 'anthropic_claude'
  return null
}

function buildModelRoutingObservability(input: StartAssistantTurnInput): Record<string, unknown> {
  const requestedModelId = input.selectedSettings?.requestedModelId ?? null
  const subscriptionModelId = requestedModelId ?? input.gatewayModelId
  return {
    chat_model_routing: {
      selected_model_input: input.selectedModelInput ?? null,
      requested_model_id: requestedModelId,
      resolved_model_id: input.selectedSettings?.resolvedModelId ?? null,
      gateway_model_id: input.gatewayModelId,
      subscription_provider: resolveSubscriptionCredentialProvider(subscriptionModelId),
      model_settings: input.selectedSettings?.request ?? null,
    },
  }
}

interface StartAssistantTurnResult {
  messageId: string
  runId: string
  requestId: string
  traceId: string | null
  sendRunEvent: (type: string, data: Record<string, unknown>) => Promise<void>
}

@Injectable()
export class ChatAssistantTurnService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly chatRunEvents: ChatRunEventStoreService,
    private readonly streamRegistry: StreamRegistryService,
    private readonly messageTimeline: MessageTimelineService,
    private readonly tracing: TracingService,
  ) {}

  async start(input: StartAssistantTurnInput): Promise<StartAssistantTurnResult> {
    const messageId = input.messageId ?? crypto.randomUUID()
    const runId = input.runId ?? messageId
    const requestId =
      typeof input.requestId === 'string' && input.requestId.trim().length > 0
        ? input.requestId.trim().slice(0, 256)
        : crypto.randomUUID()
    const observability = buildModelRoutingObservability(input)

    await input.sendSetupStatus('Starting the response')
    input.logChatTiming('assistant_message_create_start')
    await input.dbOp((s) =>
      this.messages.create(s, {
        id: messageId,
        conversation_id: input.conversationId,
        role: 'assistant',
        content: '',
      }),
    )
    input.logChatTiming('assistant_message_created', { message_id: messageId })

    this.streamRegistry.register(input.conversationId, messageId)
    this.streamRegistry.registerSend(input.conversationId, input.send)
    input.logChatTiming('stream_registry_registered', { message_id: messageId })
    if (!input.runId) {
      await this.chatRunEvents
        .startRun({
          runId,
          requestId,
          conversationId: input.conversationId,
          messageId,
          userId: input.userId,
          orgId: input.orgId ?? null,
          executionMode: 'direct',
          agentKey: input.resolvedAgentId,
          gatewayAgentId: input.gatewayAgentId,
          observability,
        })
        .catch(() => null)
    } else {
      await this.chatRunEvents
        .attachRunMessage(runId, messageId)
        .catch((err) =>
          input.logger.warn(
            `[ChatRuntimeRuns] attachRunMessage failed run=${runId}: ${String(err)}`,
          ),
        )
    }

    const appendRunEventOnly = async (
      type: string,
      data: Record<string, unknown>,
    ): Promise<string | null> => {
      const stored = await this.chatRunEvents
        .appendEvent({ runId, type, payload: data })
        .catch(() => null)
      if (stored) {
        input.streamMirrorService.recordRedisEvent(input.streamMirrorState, type, data)
      }
      return stored?.cursor ?? null
    }
    const sendRunEvent = async (type: string, data: Record<string, unknown>): Promise<void> => {
      input.streamMirrorService.recordLiveEvent(input.streamMirrorState, type, data)
      const cursor = await appendRunEventOnly(type, data)
      await input.send(type, cursor ? { ...data, run_id: runId, cursor } : data)
    }

    await input.streamMirrorService.flushPreRunEvents(input.streamMirrorState, appendRunEventOnly)
    this.streamRegistry.registerSend(input.conversationId, sendRunEvent)
    input.logChatTiming('message_start_send_start', { message_id: messageId })
    await sendRunEvent('message_start', {
      message_id: messageId,
      conversation_id: input.conversationId,
      run_id: runId,
      request_id: requestId,
    })
    input.logChatFlow(
      `[ChatFlow] message_start_after_ms=${Date.now() - input.streamStartedAt} ${input.chatDiag} messageId=${messageId}`,
    )
    input.logChatTiming('message_start_sent', { message_id: messageId })
    await this.messageTimeline
      .appendEvent({
        userId: input.userId,
        conversationId: input.conversationId,
        messageId,
        type: 'message_start',
        payload: {},
      })
      .catch((err) =>
        input.logger.warn(
          `[TimelineNonBlocking] appendEvent failed for message_start messageId=${messageId}: ${String(err)}`,
        ),
      )
    input.logChatTiming('message_start_timeline_done', { message_id: messageId })
    if (input.completedPlatformTools.length > 0) {
      const platformTimelineEvents = input.completedPlatformTools.flatMap((tool) => [
        { type: 'tool_start', payload: tool.startPayload },
        { type: 'tool_end', payload: tool.endPayload },
      ])
      for (const event of platformTimelineEvents) {
        await this.messageTimeline
          .appendEvent({
            userId: input.userId,
            conversationId: input.conversationId,
            messageId,
            type: event.type,
            payload: event.payload,
          })
          .catch((err) =>
            input.logger.warn(
              `[TimelineNonBlocking] appendEvent failed for ${event.type} messageId=${messageId}: ${String(err)}`,
            ),
          )
      }
      input.logChatTiming('platform_context_timeline_done', {
        message_id: messageId,
        platform_tool_count: input.completedPlatformTools.length,
      })
    }

    await this.chatRunEvents
      .recordRunRouting({
        runId,
        agentKey: input.resolvedAgentId,
        gatewayAgentId: input.gatewayAgentId,
        observability,
      })
      .catch((err) =>
        input.logger.warn(
          `[ChatRuntimeRuns] routing persist failed run=${runId}: ${String(err)}`,
        ),
      )

    const traceId = await this.tracing.startTrace({
      userId: input.userId,
      conversationId: input.conversationId,
      messageId,
      runId,
      requestId,
      campaignId: input.resolvedCampaignId ?? undefined,
      sessionKey: input.sessionKey,
      userMessage: input.content,
      systemPrompt: input.instructions,
      historyLength: input.historyLength,
      channel: input.resolvedChannel,
      agentKey: input.resolvedAgentId,
      orgId: input.orgId,
      gatewayAgentId: input.gatewayAgentId,
      model: input.gatewayModelId,
      observability,
    })
    input.logChatTiming('trace_started', { message_id: messageId, trace_id: traceId })

    return { messageId, runId, requestId, traceId, sendRunEvent }
  }
}
