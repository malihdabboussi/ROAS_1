import { Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ChatScopeKind,
  DocumentIntelligenceMetadata,
  SupabaseServiceClient,
} from '@vibey/api-shared'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import type { RequestUploadAttachment } from '../../shared/services/request-context.service'
import { RequestContextService } from '../../shared/services/request-context.service'
import { ChatProgressiveStreamService } from './chat-progressive-stream.service'
import { ChatReferenceContextService } from './chat-reference-context.service'
import type { ChatRunCheckpointKind } from './chat-run-checkpoint.service'
import { ChatRunCheckpointService } from './chat-run-checkpoint.service'
import type { CompletedPlatformTool } from './chat-setup-events.service'
import type { RecordChatTurnTimingSpan } from './chat-turn-session.service'
import { MessageTimelineService } from './message-timeline.service'
import type { SendFn } from './openclaw-proxy.service'

type DbOperation = <T>(operation: (supabase: SupabaseClient) => Promise<T>) => Promise<T>
type ToolStep = { name: string; label: string; status: string }

interface ChannelUser {
  platform_id: string
  username?: string
  display_name: string
  language?: string
  relationship_kind?: 'internal'
  is_connection_owner?: boolean
  personal_brain_access?: boolean
  organization_wide_data_access?: boolean
}

interface StreamDocument {
  filename: string
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  fileUrl?: string
  mimeType?: string
  mediaAssetId?: string
  sizeBytes?: number
  pageCount?: number
  preview?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

interface HighlightedArtifact {
  id: string
  type: string
  label: string
}

interface MessageReference {
  kind: 'artifact' | 'media' | 'mission' | 'conversation' | 'person' | 'campaign'
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

interface UiSelectedArtifact {
  id: string
  type: string
  label?: string
  campaign_id?: string | null
  parent?: {
    type: string
    id: string
  } | null
}

interface MessageScope {
  space_id: string | null
  campaign_id: string | null
  scope_kind: ChatScopeKind | 'unknown'
  org_id: string | null
}

interface CreateStreamingStateInput {
  conversationId: string
  userId: string
  orgId?: string | null
  resolvedCampaignId?: string | null
  currentAccessToken: string
  currentRefreshToken: string | null
  selectedModelInput: string | null
  resolvedChannel: 'telegram' | 'slack' | 'studio'
  channelUser?: ChannelUser
  messageScope: MessageScope
  messageId: string
  runId: string
  completedPlatformTools: CompletedPlatformTool[]
  documents?: StreamDocument[]
  conversationMetadata: unknown
  highlightedArtifacts?: HighlightedArtifact[]
  messageReferences?: MessageReference[]
  uiSelectedArtifact?: UiSelectedArtifact
  dbOp: DbOperation
  chatDiag: string
  sendRunEvent: SendFn
  streamStartedAt: number
  logChatFlow: (message: string) => void
  recordTimingSpan: RecordChatTurnTimingSpan
  logger: Logger
  referenceContextService: ChatReferenceContextService
}

export interface ChatTurnStreamingState {
  toolSteps: ToolStep[]
  orderedBlocks: Record<string, unknown>[]
  getAccumulatedContent: () => string
  getCompletedVisibleToolCount: () => number
  recordRunCheckpoint: (
    kind: ChatRunCheckpointKind,
    checkpoint: {
      summary: string
      remainingWork?: string | null
      lastCursor?: string | null
      toolCount?: number
      contentLength?: number
      contextWindowTokens?: number | null
      lastCallInputTokens?: number | null
      compactionCount?: number | null
      rawSnapshot?: Record<string, unknown>
    },
  ) => Promise<void>
  progressiveSend: SendFn
  setModelStreamStartedAt: (timestamp: number) => void
  clearFlushTimer: () => void
}

@Injectable()
export class ChatTurnStreamingStateService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly messageTimeline: MessageTimelineService,
    private readonly requestContext: RequestContextService,
    private readonly checkpointService: ChatRunCheckpointService,
    private readonly progressiveStreamService: ChatProgressiveStreamService,
    private readonly svc: SupabaseServiceClient,
  ) {}

  create(input: CreateStreamingStateInput): ChatTurnStreamingState {
    const state: ChatTurnStreamingState = {
      toolSteps: [],
      orderedBlocks: [],
      getAccumulatedContent: () => '',
      getCompletedVisibleToolCount: () => 0,
      recordRunCheckpoint: async () => undefined,
      progressiveSend: async () => undefined,
      setModelStreamStartedAt: () => undefined,
      clearFlushTimer: () => undefined,
    }
    let modelStreamStartedAt = input.streamStartedAt
    state.setModelStreamStartedAt = (timestamp) => {
      modelStreamStartedAt = timestamp
    }
    const progressiveStreamState = this.progressiveStreamService.createState(
      input.messageId,
      input.completedPlatformTools,
    )
    state.orderedBlocks = this.progressiveStreamService.getOrderedBlocks(progressiveStreamState)
    state.getAccumulatedContent = () =>
      this.progressiveStreamService.getAccumulatedContent(progressiveStreamState)
    state.getCompletedVisibleToolCount = () =>
      this.progressiveStreamService.getCompletedVisibleToolCount(progressiveStreamState)
    state.recordRunCheckpoint = async (kind, checkpoint): Promise<void> => {
      await this.checkpointService.record({
        runId: input.runId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        userId: input.userId,
        orgId: input.orgId ?? null,
        kind,
        summary: checkpoint.summary,
        remainingWork: checkpoint.remainingWork,
        lastCursor: checkpoint.lastCursor,
        toolCount: checkpoint.toolCount ?? state.getCompletedVisibleToolCount(),
        contentLength: checkpoint.contentLength ?? state.getAccumulatedContent().length,
        contextWindowTokens: checkpoint.contextWindowTokens,
        lastCallInputTokens: checkpoint.lastCallInputTokens,
        compactionCount: checkpoint.compactionCount,
        rawSnapshot: checkpoint.rawSnapshot,
      })
    }

    const flushContentToDB = async () =>
      this.progressiveStreamService.flushContentToDB(progressiveStreamState, {
        getToolSteps: () => state.toolSteps,
        updateMessage: (updates) => this.messages.update(this.svc.client, input.messageId, updates),
        logger: input.logger,
      })
    state.progressiveSend = this.progressiveStreamService.createSend(progressiveStreamState, {
      appendTimelineEvent: (type, payload) =>
        this.messageTimeline.appendEvent({
          userId: input.userId,
          conversationId: input.conversationId,
          messageId: input.messageId,
          type,
          payload,
        }),
      chatDiag: input.chatDiag,
      flushContentToDB,
      logger: input.logger,
      messageId: input.messageId,
      recordToolCheckpoint: async ({ accumulatedContent, completedVisibleToolCount, data, type }) =>
        state.recordRunCheckpoint('tool_batch', {
          summary: `Completed ${completedVisibleToolCount} visible tool events.`,
          remainingWork: 'Continue the assistant turn from the latest streamed state.',
          toolCount: completedVisibleToolCount,
          contentLength: accumulatedContent.length,
          rawSnapshot: {
            event_type: type,
            tool_name: data.name,
            tool_label: data.label,
            tool_status: data.status,
            content_tail: accumulatedContent.slice(-1000),
          },
        }),
      sendRunEvent: input.sendRunEvent,
      streamStartedAt: input.streamStartedAt,
      getFirstVisibleSpanStart: () => modelStreamStartedAt,
      recordTimingSpan: input.recordTimingSpan,
      logChatFlow: input.logChatFlow,
    })
    state.clearFlushTimer = () =>
      this.progressiveStreamService.clearFlushTimer(progressiveStreamState)

    this.seedRequestContext(input)
    return state
  }

  private seedRequestContext(input: CreateStreamingStateInput): void {
    this.requestContext.set(
      input.conversationId,
      input.userId,
      input.resolvedCampaignId ?? null,
      input.currentAccessToken,
      input.currentRefreshToken,
      input.selectedModelInput,
      input.orgId ?? null,
      input.resolvedChannel,
      input.channelUser
        ? {
            platform_id: input.channelUser.platform_id,
            display_name: input.channelUser.display_name,
            username: input.channelUser.username,
            relationship_kind: input.channelUser.relationship_kind,
            is_connection_owner: input.channelUser.is_connection_owner,
            personal_brain_access: input.channelUser.personal_brain_access,
            organization_wide_data_access: input.channelUser.organization_wide_data_access,
          }
        : null,
      input.messageScope.space_id,
      input.messageScope.scope_kind,
      input.messageId,
      (input.documents ?? [])
        .map(this.requestUploadAttachmentFromDocument)
        .filter((attachment): attachment is RequestUploadAttachment => attachment !== null),
    )
    input.referenceContextService.seedActiveWorkingSetFromMetadata(
      input.conversationId,
      input.conversationMetadata,
      this.requestContext,
    )
    input.referenceContextService.seedActiveWorkingSet(
      {
        conversationId: input.conversationId,
        campaignId: input.resolvedCampaignId ?? null,
        highlightedArtifacts: input.highlightedArtifacts,
        messageReferences: input.messageReferences,
        uiSelectedArtifact: input.uiSelectedArtifact,
      },
      this.requestContext,
    )
  }

  private requestUploadAttachmentFromDocument(doc: StreamDocument): RequestUploadAttachment | null {
    if (!doc.fileUrl) return null
    return {
      filename: doc.filename,
      fileUrl: doc.fileUrl,
      ...(doc.mimeType ? { mimeType: doc.mimeType } : {}),
      type: doc.type,
      ...(doc.mediaAssetId ? { mediaAssetId: doc.mediaAssetId } : {}),
      ...(typeof doc.sizeBytes === 'number' && Number.isFinite(doc.sizeBytes)
        ? { sizeBytes: doc.sizeBytes }
        : {}),
    }
  }
}
