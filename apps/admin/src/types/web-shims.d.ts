declare module '@web/features/studio/types' {
  export type DocumentAttachment = {
    id?: string
    name?: string
    url?: string
    mime_type?: string
    size?: number
    [key: string]: unknown
  }

  export type Message = {
    id: string
    conversation_id?: string
    role: string
    content: string
    content_blocks?: unknown
    metadata?: Record<string, unknown>
    created_at?: string
  }
}

declare module '@web/features/studio/store/use-chat-store' {
  import type { Message } from '@web/features/studio/types'

  export type ConversationStreamUI = {
    agentPhase: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'
    agentStatusMessage: string | null
    activeTools: Array<{ name: string; label: string; toolCallId?: string }>
    flowTimeline: unknown[]
    imageGeneratedEvents: unknown[]
    statusMessages: string[]
  }

  export type FlowTimelineBlock = unknown

  export interface ChatStoreState {
    messagesByConversation: Record<string, Message[]>
    streamingMessageIdsByConversation: Record<string, string | null>
    streamingConversationIds: string[]
    stoppingConversationIds: string[]
    addMessage: (conversationId: string, message: Message) => void
    setMessages: (conversationId: string, messages: Message[]) => void
    updateMessage: (
      conversationId: string,
      messageId: string,
      patch: Partial<Message>,
    ) => void
    appendToMessage: (conversationId: string, messageId: string, chunk: string) => void
    setConversationStreamingMessageId: (conversationId: string, messageId: string | null) => void
    setConversationStreaming: (conversationId: string, streaming: boolean) => void
    setConversationReconnecting: (conversationId: string, reconnecting: boolean) => void
    setConversationInterrupted: (conversationId: string, interrupted: boolean) => void
    setIsStreaming: (streaming: boolean) => void
    setInlineError: (error: string | null) => void
    updateConversationStreamUI: (
      conversationId: string,
      updater:
        | ConversationStreamUI
        | ((ui: ConversationStreamUI) => Partial<ConversationStreamUI>),
    ) => void
    finalizeStreamWithMessages: (
      conversationId: string,
      messageId: string | null,
      keepGlobalStreaming: boolean,
      reconnecting: boolean,
    ) => void
    completeThinkingTranscriptInOrderedBlocks: (conversationId: string, messageId: string) => void
    pushToolToOrderedBlocks: (
      conversationId: string,
      messageId: string,
      tool: Record<string, unknown>,
    ) => void
    appendToolProgressToOrderedBlocks: (
      conversationId: string,
      messageId: string,
      name: string,
      detail: string,
      ts: number,
      toolCallId?: string,
    ) => void
    setToolContentPreview: (
      conversationId: string,
      messageId: string,
      name: string,
      previewContent: string,
      toolCallId?: string,
    ) => void
    updateToolBlockByName: (
      conversationId: string,
      messageId: string,
      name: string,
      status: string,
      ts: number,
      toolCallId?: string,
    ) => void
    pushGenerationStartToOrderedBlocks: (
      conversationId: string,
      messageId: string,
      generation: Record<string, unknown>,
    ) => void
    completeGenerationInOrderedBlocks: (
      conversationId: string,
      messageId: string,
      ts: number,
    ) => void
    appendUiBlockToOrderedBlocks: (
      conversationId: string,
      messageId: string,
      block: Record<string, unknown>,
    ) => void
    upsertThinkingTranscriptInOrderedBlocks: (
      conversationId: string,
      messageId: string,
      text: string,
    ) => void
    appendTextToOrderedBlocks: (
      conversationId: string,
      messageId: string,
      delta: string,
    ) => void
  }

  export const useChatStore: {
    getState: () => ChatStoreState
    <T>(selector: (s: ChatStoreState) => T): T
  }

  export function endToolInTimeline(...args: unknown[]): unknown[]
  export function progressToolInTimeline(...args: unknown[]): unknown[]
  export function startToolInTimeline(...args: unknown[]): unknown[]
  export function upsertGenerationInTimeline(...args: unknown[]): unknown[]
}

declare module '@web/features/studio/components/ChatInput' {
  import type { ComponentType } from 'react'
  import type { DocumentAttachment } from '@web/features/studio/types'

  export const ChatInput: ComponentType<{
    onSend: (content: string, documents?: DocumentAttachment[]) => void | Promise<void>
    disabled?: boolean
    isStreaming?: boolean
    onStop?: () => void
    conversationId?: string | null
    placeholder?: string
    initialValue?: string
    initialDocuments?: DocumentAttachment[]
    restoreNonce?: string
    compact?: boolean
    agentKey?: string
  }>
}

declare module '@web/features/studio/components/MessageBubble' {
  import type { ComponentType } from 'react'
  import type { Message } from '@web/features/studio/types'

  export const MessageBubble: ComponentType<{
    message: Message
    isStreaming?: boolean
    conversationIdOverride?: string | null
    agentKey?: string
  }>
}

declare module '@web/features/studio/components/chat/StatusIndicator' {
  import type { ComponentType } from 'react'
  export const StatusIndicator: ComponentType<{ conversationIdOverride?: string | null }>
}

declare module '@web/features/studio/components/chat/StreamInterruptedBar' {
  import type { ComponentType } from 'react'
  export const StreamInterruptedBar: ComponentType<{ conversationId?: string | null }>
}

declare module '@web/lib/utils/text' {
  export function stripEmoji(
    text: string,
    options?: { preserveFormatting?: boolean },
  ): string
}

declare module '@web/features/settings/contexts/WorkspaceSettingsModalContext' {
  import type { ReactNode } from 'react'
  export function WorkspaceSettingsModalProvider(props: { children: ReactNode }): ReactNode
}

declare module '@web/features/team/components/voice/VoiceApprovalContext' {
  import type { ReactNode } from 'react'
  export const VoiceApprovalProvider: React.ComponentType<{
    value: unknown
    children: ReactNode
  }>
}
