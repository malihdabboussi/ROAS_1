import type { ReactNode, RefObject } from 'react'
import { ArrowDown } from 'lucide-react'
import { ComposerInputStack, MessageQueue, PlanStickyTracker } from '@/components/chat'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { RateLimitCard } from '@/components/chat/RateLimitCardAdapter'
import { StatusIndicator } from '@/components/chat/StatusIndicatorAdapter'
import { StreamInterruptedBar } from '@/components/chat/StreamInterruptedBarAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { ChatModelSettings } from '@/lib/chat'
import type {
  Conversation,
  DocumentAttachment,
  Message,
} from '@/lib/chat/studio-chat-runtime-adapter'
import { cn } from '@/lib/utils/cn'
import { VoiceSessionTasks } from '../voice/VoiceSessionTasks'
import type { AgentChatTurnData } from './agent-chat-panel.logic'

interface AgentChatQueueItem {
  id: string
  content: string
}

interface AgentChatThreadProps {
  initializing: boolean
  selectedSession: Conversation | null
  selectedSessionId: string | null
  messages: Message[]
  voiceDelegationMessages: Message[]
  turnData: AgentChatTurnData
  pinnedAssistantMessageId: string | null
  streamingMessageId: string | null
  lastUserMessageId: string | null
  knownSkillKeys: Set<string>
  agentKey: string
  activeCampaignId: string | null
  scrollRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  lastUserPromptRef: RefObject<HTMLDivElement | null>
  spacerHeight: number
  lastUserPromptHeight: number
  threadHorizontalPad: string
  composerFooterClass: string
  userHasScrolledUp: boolean
  creditsLow: boolean
  creditsLowRemaining: number | null
  creditsExhausted: boolean
  queue: AgentChatQueueItem[]
  composerTopSlot: ReactNode
  composerOverlay: ReactNode
  composerInput: ReactNode
  homeComposerStyle: boolean
  compactLayout?: boolean
  isStreaming: boolean
  onScroll: () => void
  onScrollToBottom: () => void
  onEditSubmit: (
    newContent: string,
    documents?: DocumentAttachment[],
    model?: string,
    modelSettings?: ChatModelSettings,
  ) => Promise<void>
  onQueueRemove: (itemId: string) => void
  onQueueSendNow: (itemId: string) => Promise<void>
  onQueueEdit: (item: AgentChatQueueItem) => void
  onBuyMoreCredits: () => void
  onBuyMoreCreditsAfterExhaustion: () => void
  onUpgradePlan: () => void
}

export function AgentChatThread({
  initializing,
  selectedSession,
  selectedSessionId,
  messages,
  voiceDelegationMessages,
  turnData,
  pinnedAssistantMessageId,
  streamingMessageId,
  lastUserMessageId,
  knownSkillKeys,
  agentKey,
  activeCampaignId,
  scrollRef,
  contentRef,
  lastUserPromptRef,
  spacerHeight,
  lastUserPromptHeight,
  threadHorizontalPad,
  composerFooterClass,
  userHasScrolledUp,
  creditsLow,
  creditsLowRemaining,
  creditsExhausted,
  queue,
  composerTopSlot,
  composerOverlay,
  composerInput,
  homeComposerStyle,
  compactLayout = false,
  isStreaming,
  onScroll,
  onScrollToBottom,
  onEditSubmit,
  onQueueRemove,
  onQueueSendNow,
  onQueueEdit,
  onBuyMoreCredits,
  onBuyMoreCreditsAfterExhaustion,
  onUpgradePlan,
}: AgentChatThreadProps) {
  return (
    <>
      <PlanStickyTracker messages={messages} scrollContainerRef={scrollRef} />
      {messages.length > 0 || initializing ? (
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className={cn(
            'flex min-h-0 flex-col overflow-y-auto overflow-x-hidden',
            compactLayout ? 'max-h-1/2 flex-none' : 'flex-1',
            threadHorizontalPad,
          )}
        >
          <div
            ref={contentRef}
            className={cn(
              'mx-auto flex w-full max-w-3xl flex-col',
              compactLayout ? 'min-h-0' : 'min-h-full flex-1',
            )}
          >
            {initializing && messages.length === 0 ? (
              <div className="py-spacing-6 flex min-h-0 flex-col items-center justify-center">
                <VibeyLoadingOrb
                  text={
                    (selectedSession?.metadata as Record<string, unknown> | undefined)
                      ?.team_draft === true
                      ? 'Starting conversation...'
                      : 'Loading conversation...'
                  }
                  state="processing"
                  size="md"
                />
              </div>
            ) : (
              <div className={cn('flex flex-col gap-3', !compactLayout && 'flex-1')}>
                {turnData.leadingMessages.map((message) => (
                  <div key={message.id} data-message-id={message.id}>
                    <MessageBubble
                      message={message}
                      isStreaming={message.id === streamingMessageId}
                      isEditable={message.id === lastUserMessageId}
                      onEditSubmit={message.id === lastUserMessageId ? onEditSubmit : undefined}
                      conversationIdOverride={selectedSessionId}
                      knownSkillKeys={knownSkillKeys}
                      agentKey={agentKey}
                      campaignId={activeCampaignId ?? undefined}
                      pinAssistantActions={message.id === pinnedAssistantMessageId}
                    />
                  </div>
                ))}

                {turnData.turns.map((turn, turnIdx) => {
                  const isLastTurn = turnIdx === turnData.turns.length - 1
                  return (
                    <div
                      key={turn.user.id}
                      data-turn-id={turn.user.id}
                      className={`relative flex flex-col ${isLastTurn && !compactLayout ? 'flex-1' : ''}`}
                    >
                      <div
                        ref={isLastTurn ? lastUserPromptRef : undefined}
                        className="sticky top-0 z-10"
                      >
                        <div className="surface-bg">
                          <MessageBubble
                            message={turn.user}
                            isStreaming={false}
                            stickyUser
                            isEditable={turn.user.id === lastUserMessageId}
                            onEditSubmit={
                              turn.user.id === lastUserMessageId ? onEditSubmit : undefined
                            }
                            conversationIdOverride={selectedSessionId}
                            knownSkillKeys={knownSkillKeys}
                            agentKey={agentKey}
                            campaignId={activeCampaignId ?? undefined}
                          />
                        </div>
                        <div className="pointer-events-none h-6 bg-gradient-to-b from-[var(--color-background)] to-transparent" />
                      </div>

                      <div
                        className="flex flex-col gap-3"
                        style={
                          isLastTurn && !compactLayout
                            ? {
                                minHeight: Math.max(0, spacerHeight - lastUserPromptHeight),
                              }
                            : undefined
                        }
                      >
                        {turn.responses.map((message) => (
                          <div key={message.id} data-message-id={message.id}>
                            <MessageBubble
                              message={message}
                              isStreaming={message.id === streamingMessageId}
                              isEditable={message.id === lastUserMessageId}
                              onEditSubmit={
                                message.id === lastUserMessageId ? onEditSubmit : undefined
                              }
                              conversationIdOverride={selectedSessionId}
                              knownSkillKeys={knownSkillKeys}
                              agentKey={agentKey}
                              campaignId={activeCampaignId ?? undefined}
                              pinAssistantActions={message.id === pinnedAssistantMessageId}
                            />
                          </div>
                        ))}
                        {isLastTurn && (
                          <div className="mt-1">
                            {voiceDelegationMessages.length > 0 && (
                              <div className="mb-3">
                                <VoiceSessionTasks
                                  messages={voiceDelegationMessages}
                                  conversationId={selectedSessionId}
                                />
                              </div>
                            )}
                            <StatusIndicator conversationIdOverride={selectedSessionId} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="hidden" aria-hidden />
      )}

      {!compactLayout && messages.length === 0 && !initializing ? (
        <div className="flex flex-col items-center justify-center py-24">
          <h1 className="title-h2 text-foreground text-center">WHAT ARE WE BUILDING TODAY?</h1>
        </div>
      ) : null}

      {creditsLow && !creditsExhausted && (
        <div className="bg-warning/10 flex items-center justify-center gap-2 px-4 py-2">
          <span className="body-3 text-warning">
            Running low on credits ({creditsLowRemaining} remaining)
          </span>
          <button
            onClick={onBuyMoreCredits}
            className="body-3 text-warning hover:text-warning font-medium underline"
          >
            Buy more
          </button>
        </div>
      )}

      {creditsExhausted && (
        <div className="bg-destructive/10 flex flex-col items-center gap-3 px-4 py-4">
          <p className="body-2 text-foreground font-medium">You&apos;ve run out of credits</p>
          <div className="flex gap-2">
            <button
              onClick={onBuyMoreCreditsAfterExhaustion}
              className="body-2 chip-glass-green rounded-lg px-4 py-2 font-medium transition-opacity hover:opacity-90"
            >
              Buy More Credits
            </button>
            <button
              onClick={onUpgradePlan}
              className="body-2 chip-glass-neutral rounded-lg px-4 py-2 font-medium transition-colors"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      )}

      <StreamInterruptedBar conversationId={selectedSessionId} />

      <div className={composerFooterClass}>
        {userHasScrolledUp && messages.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center">
            <button
              type="button"
              onClick={onScrollToBottom}
              className="border-border bg-card pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_0_12px_4px_rgba(0,0,0,0.4)] transition-all hover:opacity-90"
              aria-label="Scroll to latest messages"
              title="Scroll to latest"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="w-full max-w-3xl">
          <RateLimitCard />
          <MessageQueue
            items={queue}
            onRemove={onQueueRemove}
            onSendNow={onQueueSendNow}
            onEdit={onQueueEdit}
          />
          {composerTopSlot}
          <ComposerInputStack stackActive={false}>
            <div className="relative">
              {composerOverlay}
              {homeComposerStyle ? (
                <div className="section-card card-elevated overflow-visible">
                  <div className="px-4 pb-3 pt-3 sm:px-5">{composerInput}</div>
                </div>
              ) : (
                composerInput
              )}
            </div>
          </ComposerInputStack>
        </div>
      </div>
    </>
  )
}
