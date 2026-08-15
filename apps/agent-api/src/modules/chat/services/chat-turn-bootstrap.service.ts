import { Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatScopeKind, DocumentIntelligenceMetadata } from '@vibey/api-shared'
import { ConversationsRepository } from '../../conversations/repositories/conversations.repository'
import { MessagesRepository } from '../../conversations/repositories/messages.repository'
import { ChatContextRepository } from '../repositories/chat-context.repository'
import { ChatContactLinkingService } from './chat-contact-linking.service'
import type { ChatModelSettings } from './chat-model-input.service'
import type {
  ChatStablePrewarmContext,
  ChatStablePrewarmContextResolution,
} from './chat-prewarm-context.service'
import type { RecordChatTurnTimingSpan } from './chat-turn-session.service'

type DbOperation = <T>(operation: (supabase: SupabaseClient) => Promise<T>) => Promise<T>

interface BootstrapDocument {
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

interface BootstrapInput {
  conversationId: string
  content: string
  model?: string
  modelSettings?: ChatModelSettings
  userId: string
  orgId?: string
  hidden?: boolean
  documents?: BootstrapDocument[]
  highlightedArtifacts?: HighlightedArtifact[]
  messageReferences?: MessageReference[]
  uiSelectedArtifact?: UiSelectedArtifact
  messageScope: MessageScope
  hasMessageCampaignScope: boolean
  prewarmCacheKey: string | null
  resolvePrewarmedStableContext?: () => Promise<ChatStablePrewarmContextResolution>
  chatDiag: string
  dbOp: DbOperation
  sendSetupStatus: (message: string) => Promise<void>
  logChatFlow: (message: string) => void
  logChatTiming: (stage: string, extra?: Record<string, unknown>) => void
  recordTimingSpan: RecordChatTurnTimingSpan
  logger: Pick<Logger, 'log' | 'warn'>
}

export interface BootstrapResult {
  history: Record<string, unknown>[]
  conversation: Record<string, unknown> | null
  prewarmedStableContext: ChatStablePrewarmContext | null
  prewarmContextResult: ChatStablePrewarmContextResolution | null
}

@Injectable()
export class ChatTurnBootstrapService {
  constructor(
    private readonly messages: MessagesRepository,
    private readonly conversations: ConversationsRepository,
    private readonly contactLinking: ChatContactLinkingService,
    private readonly chatContextRepository: ChatContextRepository,
  ) {}

  async load(input: BootstrapInput): Promise<BootstrapResult> {
    const userMsgMeta = this.buildUserMessageMetadata(input)
    await input.sendSetupStatus('Saving your message')
    await input.dbOp((supabase) =>
      this.messages.create(supabase, {
        conversation_id: input.conversationId,
        role: 'user',
        content: input.content,
        model_id: input.model,
        ...(Object.keys(userMsgMeta).length > 0 ? { metadata: userMsgMeta } : {}),
      }),
    )
    input.logChatTiming('user_message_saved', {
      user_message_meta_keys: Object.keys(userMsgMeta).length,
    })

    const contactLinkingStartedAt = Date.now()
    await input
      .dbOp((supabase) =>
        this.contactLinking.tryExtractAndLinkContact(
          supabase,
          input.conversationId,
          input.userId,
          input.content,
          input.orgId,
          input.logger,
        ),
      )
      .catch((err) => input.logger.warn(`[ContactLinking] extraction/link failed: ${String(err)}`))
    input.logChatTiming('contact_linking_done', {
      stage_ms: Date.now() - contactLinkingStartedAt,
    })
    input
      .dbOp(async (supabase) => {
        const error = await this.chatContextRepository.updateProfileLastInteraction(supabase, {
          userId: input.userId,
          timestamp: new Date().toISOString(),
        })
        if (error) {
          throw new Error(`Failed to update profile interaction timestamp: ${error.message}`)
        }
      })
      .catch((err) => input.logger.warn(`Profile update failed: ${err}`))

    await input.sendSetupStatus('Loading your conversation')
    const historyPromise = input.dbOp((supabase) =>
      this.messages.findAllByConversationId(supabase, input.conversationId),
    )
    const prewarmContextStartedAt = Date.now()
    const prewarmContextResult = input.resolvePrewarmedStableContext
      ? await input.resolvePrewarmedStableContext()
      : null
    const prewarmedStableContext = prewarmContextResult?.context ?? null
    input.logChatFlow(
      `[ChatFlow] prewarm_cache=${prewarmedStableContext ? 'hit' : 'miss'} ${input.chatDiag} cache_key=${prewarmContextResult?.cache_key ?? input.prewarmCacheKey ?? 'none'} cache_status=${prewarmContextResult?.cache_status ?? 'none'} store=${prewarmContextResult?.store ?? 'none'}`,
    )
    input.logChatTiming('prewarm_cache_checked', {
      cache_hit: Boolean(prewarmedStableContext),
      cache_status: prewarmContextResult?.cache_status ?? 'none',
      cache_store: prewarmContextResult?.store ?? 'none',
      cache_reused: prewarmContextResult?.reused ?? false,
    })
    input.recordTimingSpan('prewarm_context', prewarmContextStartedAt, {
      cache_hit: prewarmContextResult
        ? prewarmContextResult.cache_status !== 'built_on_send'
        : false,
      cache_status: prewarmContextResult?.cache_status ?? 'none',
      cache_store: prewarmContextResult?.store ?? 'none',
      cache_reused: prewarmContextResult?.reused ?? false,
      agent_cache_status: prewarmContextResult?.agent_cache_status ?? 'none',
      agent_cache_store: prewarmContextResult?.agent_store ?? 'none',
      agent_cache_reused: prewarmContextResult?.agent_reused ?? false,
      agent_cache_duration_ms: prewarmContextResult?.agent_duration_ms ?? null,
    })
    const [history, conversation] = await Promise.all([
      historyPromise,
      prewarmedStableContext
        ? Promise.resolve(prewarmedStableContext.conversation)
        : input.dbOp((supabase) =>
            input.orgId
              ? this.conversations.findByIdOrgScoped(supabase, input.conversationId, input.orgId)
              : this.conversations.findByIdScoped(
                  supabase,
                  input.conversationId,
                  input.userId,
                  input.orgId,
                ),
          ),
    ])
    input.logChatTiming('conversation_loaded', {
      history_count: history.length,
      cache_hit: Boolean(prewarmedStableContext),
      conversation_has_campaign: Boolean(conversation?.campaign_id),
      conversation_has_agent: Boolean(conversation?.agent_id),
    })

    return { history, conversation, prewarmedStableContext, prewarmContextResult }
  }

  private buildUserMessageMetadata(input: BootstrapInput): Record<string, unknown> {
    const userMsgMeta: Record<string, unknown> = {}
    if (input.hidden) userMsgMeta.hidden = true
    if (input.modelSettings) userMsgMeta.model_settings = input.modelSettings
    if (input.documents?.length) userMsgMeta.documents = input.documents
    if (input.highlightedArtifacts?.length) {
      userMsgMeta.highlighted_artifacts = input.highlightedArtifacts
    }
    if (input.messageReferences?.length) userMsgMeta.message_references = input.messageReferences
    if (input.uiSelectedArtifact) userMsgMeta.ui_selected_artifact = input.uiSelectedArtifact
    if (
      input.messageScope.scope_kind !== 'unknown' ||
      input.messageScope.space_id ||
      input.hasMessageCampaignScope
    ) {
      userMsgMeta.scope = input.messageScope
    }
    return userMsgMeta
  }
}
