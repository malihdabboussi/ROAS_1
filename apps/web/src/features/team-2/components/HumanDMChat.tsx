'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import { useDmUnread } from '../hooks/use-dm-unread'
import { useHumanDmMessages } from '../hooks/use-human-dm-messages'
import type { DmMessage, DmPartnerProfile } from '../services/dm.service'
import { HumanDMComposer, type HumanDmComposerPayload } from './HumanDMComposer'
import { HumanDMMessageBubble } from './HumanDMMessageBubble'

interface HumanDMChatProps {
  conversationId: string
  partner: DmPartnerProfile
  currentUserId: string | null
  currentUserAvatarUrl?: string | null
  currentUserName?: string | null
}

interface DateGroup {
  dateKey: string
  label: string
  messages: DmMessage[]
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = today.getTime() - target.getTime()
  if (diff === 0) return 'Today'
  if (diff === 86_400_000) return 'Yesterday'
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { weekday: 'long', month: 'long', day: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  return d.toLocaleDateString('en-US', opts)
}

function groupMessagesByDate(messages: DmMessage[]): DateGroup[] {
  const groups: DateGroup[] = []
  let current: DateGroup | null = null
  for (const msg of messages) {
    const dateKey = msg.created_at.slice(0, 10)
    if (!current || current.dateKey !== dateKey) {
      current = { dateKey, label: formatDateLabel(msg.created_at), messages: [] }
      groups.push(current)
    }
    current.messages.push(msg)
  }
  return groups
}

const HEADER_GAP_MS = 5 * 60 * 1000

export function HumanDMChat({
  conversationId,
  partner,
  currentUserId,
  currentUserAvatarUrl = null,
  currentUserName = null,
}: HumanDMChatProps) {
  const { messages, sendMessage, editMessage, deleteMessage, loading, error } =
    useHumanDmMessages(conversationId)
  const { markRead: markDmUnread } = useDmUnread()
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasNearBottomRef = useRef(true)
  const prevStateRef = useRef<{ len: number; lastId: string | null }>({ len: 0, lastId: null })

  const partnerDisplayName = partner.full_name?.trim() || 'Unknown user'
  const meDisplayName = currentUserName?.trim() || 'You'

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const attempt = (remaining: number) => {
      const container = scrollRef.current
      if (!container) return
      const maxTop = container.scrollHeight - container.clientHeight
      if (maxTop <= 0 && remaining > 0) {
        requestAnimationFrame(() => attempt(remaining - 1))
        return
      }
      if (behavior === 'smooth')
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      else container.scrollTop = container.scrollHeight
      wasNearBottomRef.current = true
    }
    requestAnimationFrame(() => attempt(6))
  }, [])

  useEffect(() => {
    prevStateRef.current = { len: 0, lastId: null }
    wasNearBottomRef.current = true
  }, [conversationId])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const isNearBottom = () =>
      container.scrollHeight - (container.scrollTop + container.clientHeight) <= 96
    const onScroll = () => {
      wasNearBottomRef.current = isNearBottom()
    }
    wasNearBottomRef.current = isNearBottom()
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const last = messages[messages.length - 1] ?? null
    const lastId = last?.id ?? null
    const prev = prevStateRef.current
    const appended = messages.length > prev.len && lastId !== prev.lastId
    if (prev.len === 0 && messages.length > 0) {
      scrollToBottom('auto')
    } else if (appended && wasNearBottomRef.current) {
      scrollToBottom('smooth')
    }
    prevStateRef.current = { len: messages.length, lastId }
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!conversationId || messages.length === 0) return
    void markDmUnread(conversationId)
  }, [conversationId, messages.length, markDmUnread])

  const groups = useMemo(() => groupMessagesByDate(messages), [messages])

  const onSend = useCallback(
    async (payload: HumanDmComposerPayload) => {
      await sendMessage(payload)
    },
    [sendMessage],
  )

  return (
    <section className="bg-background flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div ref={scrollRef} className="px-spacing-3 py-spacing-2 min-h-0 flex-1 overflow-y-auto">
        {loading && messages.length === 0 && (
          <div className="py-spacing-3">
            <ListSkeleton rows={4} label="Loading…" />
          </div>
        )}
        {error && <p className="body-3 text-destructive py-spacing-3 text-center">{error}</p>}
        {!loading && !error && messages.length === 0 && (
          <p className="body-3 text-muted-foreground py-spacing-6 text-center">
            No messages yet. Say hi to {partnerDisplayName}.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.dateKey}>
            <div className="py-spacing-3 relative flex items-center justify-center">
              <div className="border-subtle absolute inset-x-0 top-1/2 border-t" />
              <span className="border-subtle bg-card text-muted-foreground px-spacing-3 relative z-[1] rounded-full border py-0.5 text-xs font-medium shadow-sm">
                {group.label}
              </span>
            </div>
            {group.messages.map((message, idx) => {
              const isOwn = message.sender_id === currentUserId
              const senderName = isOwn ? meDisplayName : partnerDisplayName
              const avatarUrl = isOwn ? currentUserAvatarUrl : partner.avatar_url
              const prev = idx > 0 ? group.messages[idx - 1] : null
              const sameSender = !!prev && prev.sender_id === message.sender_id
              const closeInTime =
                !!prev &&
                new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() <
                  HEADER_GAP_MS
              const showHeader = !sameSender || !closeInTime
              return (
                <HumanDMMessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  senderName={senderName}
                  avatarUrl={avatarUrl ?? null}
                  showHeader={showHeader}
                  onEdit={async (id, content) => {
                    await editMessage(id, content)
                  }}
                  onDelete={async (id) => {
                    await deleteMessage(id)
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="px-spacing-3 pb-spacing-3 pt-spacing-2 shrink-0">
        <HumanDMComposer
          conversationId={conversationId}
          partnerName={partnerDisplayName}
          onSend={onSend}
        />
      </div>
    </section>
  )
}
