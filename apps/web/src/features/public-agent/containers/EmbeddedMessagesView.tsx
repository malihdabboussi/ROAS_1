'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Send, Square } from 'lucide-react'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import { MessageBubble } from '@/features/studio/components/MessageBubble'
import type { Message } from '@/features/studio/types'
import { usePublicAgentChat } from '../hooks/usePublicAgentChat'
import { usePublicAgentMessageScroll } from '../hooks/usePublicAgentMessageScroll'
import { identifyPublicVisitor } from '../services/public-agent.service'
import type { PublicAgentInfo } from '../types/public-agent.types'

interface EmbeddedMessagesViewProps {
  agent: PublicAgentInfo
  accent: string
  accentText: string
  title: string
  greeting: string | null
  initialConversationId?: string | null
  onConversationCreated?: (id: string) => void
}

export function EmbeddedMessagesView({
  agent,
  accent,
  accentText,
  title,
  greeting,
  initialConversationId,
  onConversationCreated,
}: EmbeddedMessagesViewProps) {
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
    loadExistingMessages,
    prepareConversation,
    prewarmConversation,
    getVisitorId,
    saveVisitorIdentity,
  } = usePublicAgentChat(agent.userSlug, agent.agentKey)
  const [inputValue, setInputValue] = useState('')
  const [identityEmail, setIdentityEmail] = useState('')
  const [identityFirstName, setIdentityFirstName] = useState('')
  const [identitySaving, setIdentitySaving] = useState(false)
  const [identityError, setIdentityError] = useState<string | null>(null)
  const [identityBarVisible, setIdentityBarVisible] = useState(false)
  const [identityBarExpanded, setIdentityBarExpanded] = useState(false)
  const [hasSavedIdentity, setHasSavedIdentity] = useState(false)
  const { scrollRef, latestUserMessageId, latestUserMessageRef, bottomSpacerHeight } =
    usePublicAgentMessageScroll({
      messages,
      conversationId,
      isStreaming,
    })
  const restoredRef = useRef(false)
  const conversationCreatedNotifiedRef = useRef<string | null>(null)
  const identityStorageKey = `vibey-public-visitor-identity-${agent.agentKey}`

  const hasMessages = messages.length > 0
  const firstAssistantReply = messages.some(
    (m) => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim().length > 0,
  )
  const inputDisabled = isPreparingContext && messages.length === 0

  useEffect(() => {
    const raw = localStorage.getItem(identityStorageKey)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { email?: string; name?: string; first_name?: string }
      if (typeof parsed.email === 'string' && parsed.email.trim()) {
        setIdentityEmail(parsed.email.trim())
        setHasSavedIdentity(true)
      }
      const first =
        (typeof parsed.first_name === 'string' && parsed.first_name.trim()) ||
        (typeof parsed.name === 'string' && parsed.name.trim().split(/\s+/)[0])
      if (first) setIdentityFirstName(first)
    } catch {
      // ignore malformed local storage value
    }
  }, [identityStorageKey])

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (initialConversationId) {
      conversationCreatedNotifiedRef.current = initialConversationId
      void loadExistingMessages(initialConversationId)
      void prewarmConversation(initialConversationId)
      return
    }
    void prepareConversation()
  }, [initialConversationId, loadExistingMessages, prepareConversation, prewarmConversation])

  useEffect(() => {
    if (!conversationId) return
    if (conversationCreatedNotifiedRef.current === conversationId) return
    conversationCreatedNotifiedRef.current = conversationId
    onConversationCreated?.(conversationId)
  }, [conversationId, onConversationCreated])

  useEffect(() => {
    if (!firstAssistantReply || hasSavedIdentity) return
    setIdentityBarVisible(true)
  }, [firstAssistantReply, hasSavedIdentity])

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

  const handleIdentitySubmit = useCallback(async () => {
    const email = identityEmail.trim().toLowerCase()
    const firstName = identityFirstName.trim()
    if (!email || !firstName || !conversationId) return
    setIdentityError(null)
    setIdentitySaving(true)
    try {
      const visitorId = getVisitorId()
      const result = await identifyPublicVisitor(agent.userSlug, agent.agentKey, {
        visitor_id: visitorId,
        conversation_id: conversationId,
        email,
        first_name: firstName,
      })
      if (!result) {
        setIdentityError('Could not save your details')
        return
      }
      saveVisitorIdentity({ email, name: firstName })
      setHasSavedIdentity(true)
      setIdentityBarVisible(false)
    } catch {
      setIdentityError('Could not save your details')
    } finally {
      setIdentitySaving(false)
    }
  }, [
    identityEmail,
    identityFirstName,
    conversationId,
    getVisitorId,
    agent.userSlug,
    agent.agentKey,
    saveVisitorIdentity,
  ])

  const greetingShown = !hasMessages && greeting
  const orbState =
    agentPhase === 'thinking'
      ? 'thinking'
      : agentPhase === 'executing'
        ? 'executing'
        : agentPhase === 'streaming'
          ? 'streaming'
          : undefined

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {identityBarVisible ? (
          <div className="px-3 pt-2">
            <div className="rounded-xl border border-white/15 bg-black/70 transition-all duration-300">
              <button
                type="button"
                onClick={() => setIdentityBarExpanded((v) => !v)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
                aria-expanded={identityBarExpanded}
                aria-controls="vw-identity-fields"
              >
                <span className="block min-w-0 flex-1 truncate text-xs font-medium text-white">
                  Save this chat & let us tailor replies for you
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${
                    identityBarExpanded ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </button>
              {identityBarExpanded ? (
                <div
                  id="vw-identity-fields"
                  className="border-t border-white/10 px-2.5 pb-2.5 pt-2"
                >
                  <p className="mb-2 text-[11px] text-white/60">
                    Add your first name and email so we remember you next time and pick up where you
                    left off.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={identityFirstName}
                      onChange={(e) => setIdentityFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/30"
                    />
                    <input
                      type="email"
                      value={identityEmail}
                      onChange={(e) => setIdentityEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="h-8 min-w-0 flex-[1.4] rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-white/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleIdentitySubmit()}
                    disabled={
                      !identityEmail.trim() ||
                      !identityFirstName.trim() ||
                      identitySaving ||
                      !conversationId
                    }
                    className="mt-1.5 h-8 w-full rounded-lg text-xs font-medium transition-opacity disabled:opacity-40"
                    style={{ background: accent, color: accentText }}
                  >
                    {identitySaving ? 'Saving…' : 'Save & continue'}
                  </button>
                  {identityError ? (
                    <p className="mt-1 text-[11px] text-red-400">{identityError}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {greetingShown && (
          <div className="px-4 pt-4">
            <div className="inline-block max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white/90">
              {greeting}
            </div>
          </div>
        )}
        {hasMessages && (
          <div className="px-3 py-3">
            <div className="flex flex-col gap-2">
              {messages.map((m: Message) => (
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
          <div className="flex items-center gap-2.5 px-4 py-2">
            <VibeyChatOrb state={orbState} className="h-5 w-5" />
            <span className="text-xs text-white/50">
              {agentStatusMessage ??
                (agentPhase === 'thinking'
                  ? 'Thinking...'
                  : agentPhase === 'executing'
                    ? 'Working...'
                    : '')}
            </span>
          </div>
        )}

        {error && (
          <div className="px-4 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {bottomSpacerHeight > 0 ? <div aria-hidden style={{ height: bottomSpacerHeight }} /> : null}
      </div>

      <div className="border-t border-white/10 px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => void prewarmConversation()}
            onKeyDown={handleKeyDown}
            disabled={inputDisabled}
            placeholder={`Message ${title}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/30"
            style={{ maxHeight: 120 }}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 transition-colors hover:bg-red-500/30"
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={inputDisabled || !inputValue.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-30"
              style={{ background: accent, color: accentText }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
