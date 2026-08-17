'use client'

import { useEffect, useRef } from 'react'
import { ChatInput } from '@/components/chat/ChatInputAdapter'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import type { MessageBubbleProps } from '@/components/chat/MessageBubbleAdapter'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { WorkspaceSettingsModalProvider } from '@/lib/settings/workspace-settings-modal-context'
import type {
  PublicWorkRequestDraft,
  WorkRequestOptions,
  WorkRequestReviewResponse,
  WorkRequestUpdate,
} from '@/lib/work-requests'
import { WORK_REQUEST_MESSAGES } from '../config/messages.config'
import { useWorkRequestReviewChat } from '../hooks/useWorkRequestReviewChat'
import { WorkRequestChatFlow } from './WorkRequestChatFlow'
import { WorkRequestReviewForceOpenProvider } from './WorkRequestReviewForceOpenContext'

type Props = {
  token: string
  draft: PublicWorkRequestDraft
  options: WorkRequestOptions
  onSave: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
  onSubmit: (update: WorkRequestUpdate) => Promise<WorkRequestReviewResponse>
}

export function WorkRequestReviewChatHost({ token, draft, options, onSave, onSubmit }: Props) {
  const {
    messages,
    conversationId,
    loading,
    isStreaming,
    agentPhase,
    agentStatusMessage,
    error,
    unavailable,
    sendMessage,
    stopStreaming,
  } = useWorkRequestReviewChat(token, true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTop = node.scrollHeight
  }, [messages, isStreaming, agentStatusMessage])

  if (unavailable) {
    return (
      <WorkRequestChatFlow
        key={draft.id}
        draft={draft}
        options={options}
        presentation="page"
        onSave={onSave}
        onSubmit={onSubmit}
      />
    )
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <VibeyLoadingOrb size="lg" text={WORK_REQUEST_MESSAGES.openingChat} />
      </div>
    )
  }

  const orbState =
    agentPhase === 'thinking'
      ? 'thinking'
      : agentPhase === 'executing'
        ? 'executing'
        : agentPhase === 'streaming'
          ? 'streaming'
          : undefined

  return (
    <WorkspaceSettingsModalProvider>
      <WorkRequestReviewForceOpenProvider token={token}>
        <div className="bg-background text-foreground flex min-h-dvh flex-col">
          <header className="border-border px-spacing-4 py-spacing-3 border-b">
            <div className="mx-auto w-full max-w-3xl">
              <p className="typo-caption text-muted-foreground uppercase">Service Request chat</p>
              <h1 className="title-h6 text-foreground mt-spacing-1 uppercase">{draft.title}</h1>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="px-spacing-4 py-spacing-4 md:px-spacing-8">
              <div className="gap-spacing-3 mx-auto flex w-full max-w-3xl flex-col">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message as MessageBubbleProps['message']}
                    isStreaming={
                      isStreaming && message.role === 'assistant' && index === messages.length - 1
                    }
                    isEditable={false}
                    allowFork={false}
                    conversationIdOverride={conversationId}
                  />
                ))}
              </div>
            </div>

            {isStreaming && agentPhase !== 'idle' ? (
              <div className="px-spacing-4 py-spacing-2 md:px-spacing-8">
                <div className="gap-spacing-2 mx-auto flex w-full max-w-3xl items-center">
                  <VibeyChatOrb state={orbState} className="h-5 w-5" />
                  <span className="body-4 text-muted-foreground/60">
                    {agentStatusMessage ??
                      (agentPhase === 'thinking'
                        ? 'Thinking...'
                        : agentPhase === 'executing'
                          ? 'Working...'
                          : '')}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="px-spacing-4 py-spacing-2 text-center">
              <p role="alert" className="body-4 text-destructive">
                {error}
              </p>
            </div>
          ) : null}

          <div className="border-border px-spacing-4 py-spacing-3 md:px-spacing-6 border-t">
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput
                onSend={(content) => void sendMessage(content)}
                disabled={isStreaming}
                isStreaming={isStreaming}
                onStop={stopStreaming}
                placeholder="Message Pixel…"
                conversationId={conversationId}
                draftContextKeyOverride={`work-request-review:${token}`}
                consumePendingComposerText={false}
                compact
              />
            </div>
          </div>

          {/* Always show finalize here — Pixel often only pastes the review URL
              without a work_request UI block, which previously left a circular link. */}
          <div className="border-border px-spacing-4 py-spacing-4 md:px-spacing-6 border-t">
            <div className="mx-auto w-full max-w-3xl">
              <WorkRequestChatFlow
                draft={draft}
                options={options}
                presentation="inline"
                onSave={onSave}
                onSubmit={onSubmit}
              />
            </div>
          </div>
        </div>
      </WorkRequestReviewForceOpenProvider>
    </WorkspaceSettingsModalProvider>
  )
}
