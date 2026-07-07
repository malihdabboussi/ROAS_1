'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useCachedMissionAgents } from '@/lib/agents'
import { mergeOlderMessages, olderCursor, type ThreadMessage } from '../../lib/conversation-thread'
import {
  fetchConversationMessages,
  type ContactConversationItem,
} from '../../services/contact-communications.service'

const PAGE_SIZE = 50

export function conversationChannelBadge(channel?: string | null): {
  label: string
  badgeClass: string
} {
  if (channel === 'telegram') return { label: 'Telegram', badgeClass: 'badge-glass-blue' }
  if (channel === 'widget') return { label: 'Widget', badgeClass: 'badge-glass-green' }
  return { label: 'Agent chat', badgeClass: 'badge-glass-muted' }
}

function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ContactConversationAgentAvatar({
  conversation,
}: {
  conversation: ContactConversationItem
}) {
  const { data: agents } = useCachedMissionAgents()
  const agentImageUrl = useMemo(() => {
    const fromConversation = conversation.agent_image_url?.trim()
    if (fromConversation) return fromConversation
    const agentKey = conversation.agent_id?.trim()
    if (!agentKey || !agents?.length) return null
    return agents.find((agent) => agent.agent_key === agentKey)?.image_url?.trim() ?? null
  }, [agents, conversation.agent_id, conversation.agent_image_url])

  if (agentImageUrl) {
    return (
      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-border">
        <img src={agentImageUrl} alt="" className="h-full w-full object-cover object-top" />
      </div>
    )
  }

  const initial = (
    conversation.agent_name?.trim()?.[0] ??
    conversation.agent_id?.trim()?.[0] ??
    '?'
  ).toUpperCase()

  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-hover-subtle)] text-[var(--color-primary)]">
      <span className="typo-xs font-semibold">{initial}</span>
    </span>
  )
}

export function ContactConversationThread({
  conversation,
  onBack,
}: {
  conversation: ContactConversationItem
  onBack: () => void
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setMessages([])
    fetchConversationMessages(conversation.id, { limit: PAGE_SIZE })
      .then((page) => {
        if (cancelled) return
        setMessages(page)
        setHasOlder(page.length === PAGE_SIZE)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversation.id])

  const loadOlder = useCallback(async () => {
    const before = olderCursor(messages)
    if (!before || loadingOlder) return
    setLoadingOlder(true)
    try {
      const page = await fetchConversationMessages(conversation.id, { before, limit: PAGE_SIZE })
      setMessages((prev) => mergeOlderMessages(prev, page))
      setHasOlder(page.length === PAGE_SIZE)
    } finally {
      setLoadingOlder(false)
    }
  }, [conversation.id, messages, loadingOlder])

  const badge = conversationChannelBadge(conversation.channel)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="px-spacing-4 py-spacing-2 flex shrink-0 items-center gap-2 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
          aria-label="Back to communications"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <ContactConversationAgentAvatar conversation={conversation} />
        <div className="min-w-0 flex-1">
          <p className="body-3 truncate font-medium text-[var(--foreground)]">
            {conversation.title || 'Agent conversation'}
          </p>
          {conversation.agent_name ? (
            <p className="body-4 truncate text-[var(--color-muted-foreground)]">
              with {conversation.agent_name}
            </p>
          ) : null}
        </div>
        <span
          className={`badge-glass ${badge.badgeClass} body-4 rounded-spacing-2 inline-flex shrink-0 items-center gap-1 px-2 py-1`}
        >
          <Send className="h-3 w-3" />
          {badge.label}
        </span>
      </div>

      <div className="px-spacing-4 py-spacing-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="body-3 text-center text-[var(--color-muted-foreground)]">
            Loading conversation…
          </p>
        ) : messages.length === 0 ? (
          <p className="body-3 text-center text-[var(--color-muted-foreground)]">No messages yet</p>
        ) : (
          <>
            {hasOlder ? (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingOlder}
                  className="button-glass-neutral rounded-md px-3 py-1 text-xs disabled:opacity-40"
                >
                  {loadingOlder ? 'Loading…' : 'Load older messages'}
                </button>
              </div>
            ) : null}
            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      isUser ? 'border-comms-inner bg-[var(--background)]' : 'card-glass'
                    }`}
                  >
                    <p className="body-4 capitalize text-[var(--color-muted-foreground)]">
                      {isUser ? 'Contact' : (conversation.agent_name ?? message.role)}
                    </p>
                    <p className="body-3 mt-0.5 whitespace-pre-wrap break-words text-[var(--foreground)]">
                      {message.content}
                    </p>
                    <p className="body-4 mt-1 text-right text-[var(--color-muted-foreground)]">
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
