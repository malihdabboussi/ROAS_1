'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Send, Square } from 'lucide-react'
import { MessageBubble } from '@/components/chat/MessageBubbleAdapter'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { AgentIntroCard } from '../components/common/AgentIntroCard'
import { ConversionBar } from '../components/common/ConversionBar'
import { PoweredByVibey } from '../components/common/PoweredByVibey'
import { usePublicAgentChat } from '../hooks/usePublicAgentChat'
import { usePublicAgentMessageScroll } from '../hooks/usePublicAgentMessageScroll'
import type { PublicAgentInfo } from '../types/public-agent.types'

interface PublicAgentContainerProps {
  agent: PublicAgentInfo
}

export function PublicAgentContainer({ agent }: PublicAgentContainerProps) {
  const {
    messages,
    conversationId,
    isPreparingContext,
    isStreaming,
    agentPhase,
    agentStatusMessage,
    error,
    sendMessage,
    stopStreaming,
    prepareConversation,
    prewarmConversation,
  } = usePublicAgentChat(agent.userSlug, agent.agentKey)
  const [inputValue, setInputValue] = useState('')
  const { scrollRef, latestUserMessageId, latestUserMessageRef, bottomSpacerHeight } =
    usePublicAgentMessageScroll({
      messages,
      conversationId,
      isStreaming,
    })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const inputDisabled = isPreparingContext && messages.length === 0

  useEffect(() => {
    void prepareConversation()
  }, [prepareConversation])

  const handleSend = useCallback(
    (text?: string) => {
      const content = (text ?? inputValue).trim()
      if (!content || isStreaming || inputDisabled) return
      setInputValue('')
      void sendMessage(content)
    },
    [inputDisabled, inputValue, isStreaming, sendMessage],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0
  const orbState =
    agentPhase === 'thinking'
      ? 'thinking'
      : agentPhase === 'executing'
        ? 'executing'
        : agentPhase === 'streaming'
          ? 'streaming'
          : undefined

  return (
    <div className="bg-background flex h-dvh flex-col">
      <ConversionBar />

      <header className="border-border flex items-center gap-3 border-b px-4 py-3 md:px-6">
        <div className="relative">
          {agent.imageUrl ? (
            <img
              src={agent.imageUrl}
              alt={agent.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="bg-secondary text-muted-foreground flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="border-background bg-success absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="body-2 text-foreground truncate font-semibold">{agent.name}</h1>
          <p className="body-4 text-muted-foreground truncate">{agent.role}</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!hasMessages && !isStreaming ? (
          <AgentIntroCard
            agent={agent}
            disabled={inputDisabled}
            onStarterClick={(text) => handleSend(text)}
          />
        ) : (
          <div className="px-4 py-4 md:px-8">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  ref={m.id === latestUserMessageId ? latestUserMessageRef : undefined}
                  data-public-agent-turn-id={m.role === 'user' ? m.id : undefined}
                >
                  <MessageBubble
                    message={m}
                    isStreaming={
                      isStreaming && m.role === 'assistant' && m === messages[messages.length - 1]
                    }
                    isEditable={false}
                    allowFork={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {isStreaming && agentPhase !== 'idle' && (
          <div className="flex items-center gap-2.5 px-4 py-2 md:px-8">
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5">
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
        )}

        {bottomSpacerHeight > 0 ? <div aria-hidden style={{ height: bottomSpacerHeight }} /> : null}
      </div>

      {error && (
        <div className="px-4 py-2 text-center">
          <p role="alert" className="body-4 text-destructive">
            {error}
          </p>
        </div>
      )}

      <div className="border-border border-t px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => void prewarmConversation()}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            placeholder={`Message ${agent.name}...`}
            rows={1}
            className="body-3 text-foreground placeholder:text-muted-foreground/40 border-border bg-secondary focus:border-ring flex-1 resize-none rounded-xl border px-4 py-3 outline-none transition-colors"
            style={{ maxHeight: 120 }}
          />
          <button
            type="button"
            disabled
            aria-label="Voice mode is coming soon"
            className="bg-secondary text-muted-foreground flex h-11 w-11 shrink-0 cursor-not-allowed items-center justify-center rounded-xl opacity-50"
            title="Voice mode (coming soon)"
          >
            <Mic className="h-4 w-4" />
          </button>
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="bg-destructive/20 text-destructive hover:bg-destructive/30 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={inputDisabled || !inputValue.trim()}
              className="bg-secondary text-foreground hover:bg-hover-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-30"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <PoweredByVibey />
    </div>
  )
}
