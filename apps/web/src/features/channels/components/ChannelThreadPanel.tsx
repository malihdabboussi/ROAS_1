'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Component, X } from 'lucide-react'
import type { ChannelMember, ChannelMention, ChannelMessage } from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import { ChannelComposer } from './ChannelComposer'
import { ChannelMessageBubble } from './ChannelMessageBubble'
import { ThreadParticipants, type ThreadParticipant } from './ChannelThreadParticipants'
import { ThreadInlineProgress } from './ThreadInlineProgress'
import { extractDeliverablesFromMessage } from '../lib/channel-deliverables'

function getSenderMeta(
  message: ChannelMessage,
  members: ChannelMember[],
  rosterAvatars?: Map<string, string>,
): { label: string; avatarUrl: string | null } {
  if (message.sender_type === 'system') return { label: 'System', avatarUrl: null }
  if (message.sender_type === 'agent') {
    const member = members.find(
      (item) => item.member_type === 'agent' && item.agent_key === message.sender_id,
    )
    const rosterAvatar =
      rosterAvatars?.get(message.sender_id) ??
      (member?.agent_key ? rosterAvatars?.get(member.agent_key) : null) ??
      null
    return { label: member?.agent_key || message.sender_id, avatarUrl: rosterAvatar }
  }
  const member = members.find(
    (item) => item.member_type === 'user' && item.user_id === message.sender_id,
  )
  const rosterAvatar = rosterAvatars?.get(message.sender_id) ?? null
  return {
    label: member?.profile?.full_name || message.sender_id,
    avatarUrl: member?.profile?.avatar_url ?? rosterAvatar,
  }
}

export function ChannelThreadPanel({
  parentMessageId,
  messages,
  members,
  currentUserId,
  channelId,
  campaignId,
  rosterAvatars,
  onClose,
  onSendReply,
  onEditMessage,
  onDeleteMessage,
  onViewDeliverables,
  onRenameThread,
  onOpenDeliverablePreview,
  omitTrailingInset = false,
}: {
  parentMessageId: string
  messages: ChannelMessage[]
  members: ChannelMember[]
  currentUserId: string | null
  channelId: string
  /** Resolved campaign for the active space — used to scope channel uploads. */
  campaignId?: string | null
  rosterAvatars?: Map<string, string>
  onClose: () => void
  onSendReply: (payload: {
    content: string
    mentions: ChannelMention[]
    attachments?: string[]
  }) => Promise<void> | void
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  onViewDeliverables?: () => void
  onRenameThread?: (messageId: string, name: string | null) => Promise<void>
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  /** Spaces channels row: parent already provides `py-spacing-3`; aside drops its own pt/pb/pr and only inserts a 1.5 left gap from the chat. */
  omitTrailingInset?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasNearBottomRef = useRef(true)
  const prevReplyStateRef = useRef<{ len: number; lastId: string | null }>({ len: 0, lastId: null })
  const scrollThreadToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
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

  const parentMessage = useMemo(
    () => messages.find((m) => m.id === parentMessageId) ?? null,
    [messages, parentMessageId],
  )

  const replies = useMemo(
    () =>
      messages
        .filter((m) => m.reply_to_id === parentMessageId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [messages, parentMessageId],
  )

  const senderMeta = useMemo(() => {
    const map = new Map<string, { label: string; avatarUrl: string | null }>()
    if (parentMessage)
      map.set(parentMessage.id, getSenderMeta(parentMessage, members, rosterAvatars))
    for (const r of replies) {
      map.set(r.id, getSenderMeta(r, members, rosterAvatars))
    }
    return map
  }, [parentMessage, replies, members, rosterAvatars])

  useEffect(() => {
    prevReplyStateRef.current = { len: 0, lastId: null }
    wasNearBottomRef.current = true
    scrollThreadToBottom('auto')
  }, [parentMessageId, scrollThreadToBottom])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const isNearBottom = () =>
      container.scrollHeight - (container.scrollTop + container.clientHeight) <= 96
    const onScroll = () => {
      wasNearBottomRef.current = isNearBottom()
    }
    container.addEventListener('scroll', onScroll)
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    const lastReply = replies[replies.length - 1] ?? null
    const lastId = lastReply?.id ?? null
    const prev = prevReplyStateRef.current
    const appended = replies.length > prev.len && lastId !== prev.lastId

    if (prev.len === 0 && replies.length > 0) {
      scrollThreadToBottom('auto')
    } else if (appended && wasNearBottomRef.current) {
      scrollThreadToBottom('smooth')
    }

    prevReplyStateRef.current = { len: replies.length, lastId }
  }, [replies, scrollThreadToBottom])

  const parentMeta = parentMessage ? senderMeta.get(parentMessage.id) : null
  const isBrainstorm = !!(parentMessage?.metadata as Record<string, unknown> | null)?.brainstorm
  const defaultLabel = isBrainstorm ? 'Brainstorm' : 'Thread'
  const displayName = parentMessage?.thread_name || defaultLabel

  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [savingName, setSavingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (!editingName) setNameDraft(displayName)
  }, [displayName, editingName])

  useLayoutEffect(() => {
    if (!editingName) return
    const el = nameInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editingName])

  const cancelNameEdit = () => {
    setNameDraft(displayName)
    setEditingName(false)
  }
  const commitNameEdit = async () => {
    if (!parentMessage) {
      setEditingName(false)
      return
    }
    if (savingName) return
    const trimmed = nameDraft.trim()
    const newName = !trimmed || trimmed === defaultLabel ? null : trimmed
    if (newName === (parentMessage.thread_name ?? null)) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      await onRenameThread?.(parentMessage.id, newName)
      setEditingName(false)
    } finally {
      setSavingName(false)
    }
  }

  const threadDeliverableCount = useMemo(() => {
    const threadMsgs = messages.filter(
      (m) => m.id === parentMessageId || m.reply_to_id === parentMessageId,
    )
    let count = 0
    for (const msg of threadMsgs) {
      count += extractDeliverablesFromMessage(msg, rosterAvatars).length
    }
    return count
  }, [messages, parentMessageId, rosterAvatars])

  const participants = useMemo(() => {
    const allThreadMsgs = parentMessage ? [parentMessage, ...replies] : replies
    const seen = new Map<string, ThreadParticipant>()
    for (const msg of allThreadMsgs) {
      if (msg.sender_type === 'system') continue
      const key = `${msg.sender_type}:${msg.sender_id}`
      if (seen.has(key)) continue
      const meta = senderMeta.get(msg.id)
      seen.set(key, {
        id: msg.sender_id,
        label: meta?.label ?? msg.sender_id,
        avatarUrl: meta?.avatarUrl ?? null,
        type: msg.sender_type === 'agent' ? 'agent' : 'user',
      })
    }
    return [...seen.values()]
  }, [parentMessage, replies, senderMeta])

  const asideClassName = omitTrailingInset
    ? 'bg-background flex w-[420px] min-w-[420px] shrink-0 flex-col pl-1.5'
    : 'bg-background flex w-[420px] min-w-[420px] shrink-0 flex-col pb-2 pr-1.5 pt-2'

  if (!parentMessage) {
    return (
      <aside className={asideClassName}>
        <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
          <div className="shrink-0 px-4 py-2 md:px-6">
            <div className="flex min-h-[2.05rem] items-center justify-between">
              <h3 className="body-2 text-foreground font-semibold">Thread</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="border-border shrink-0 border-b px-4 pb-2 pt-px md:px-6">
            <div className="h-5" />
          </div>
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="body-3 text-muted-foreground">Message not found.</p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className={asideClassName}>
      <div className="border-border flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border">
        <div className="shrink-0 px-4 py-2 md:px-6">
          <div className="flex min-h-[2.05rem] items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {isBrainstorm && <Component className="h-3.5 w-3.5 shrink-0" />}
              {editingName ? (
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  disabled={savingName}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => void commitNameEdit()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelNameEdit()
                    }
                  }}
                  className="body-2 text-foreground min-w-0 flex-1 rounded-md border-[1.5px] border-[rgba(128,128,128,0.4)] bg-transparent px-1.5 py-0.5 font-semibold leading-tight outline-none disabled:opacity-60"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onRenameThread) setEditingName(true)
                  }}
                  className="body-2 text-foreground hover:bg-hover-subtle min-w-0 flex-1 truncate rounded-md px-1.5 py-0.5 text-left font-semibold leading-tight transition-colors"
                  title="Click to rename"
                >
                  {displayName}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle shrink-0 rounded p-1 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="border-border shrink-0 border-b px-4 pb-2 pt-px md:px-6">
          <div className="flex items-center justify-between">
            {participants.length > 0 ? (
              <ThreadParticipants participants={participants} />
            ) : (
              <div className="h-5" />
            )}
            {onViewDeliverables && (
              <button
                type="button"
                onClick={onViewDeliverables}
                className="typo-caption text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 transition-colors"
              >
                {threadDeliverableCount} media / deliverables
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-2 md:px-6">
          <ChannelMessageBubble
            message={parentMessage}
            senderLabel={parentMeta?.label ?? parentMessage.sender_id}
            avatarUrl={parentMeta?.avatarUrl ?? null}
            currentUserId={currentUserId}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
            compact
            hideActiveBadges
          />

          {replies.length > 0 && (
            <div className="my-3 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="typo-caption text-muted-foreground shrink-0 font-medium">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </span>
              <div className="bg-border h-px flex-1" />
            </div>
          )}

          {replies.map((reply) => {
            const meta = senderMeta.get(reply.id)
            return (
              <ChannelMessageBubble
                key={reply.id}
                message={reply}
                senderLabel={meta?.label ?? reply.sender_id}
                avatarUrl={meta?.avatarUrl ?? null}
                currentUserId={currentUserId}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onOpenDeliverablePreview={onOpenDeliverablePreview}
                compact
                hideActiveBadges
              />
            )
          })}

          <ThreadInlineProgress
            messages={messages}
            parentMessageId={parentMessageId}
            rosterAvatars={rosterAvatars}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
          />
        </div>

        <div className="shrink-0 px-4 pb-2 pt-0 md:px-6">
          <ChannelComposer
            channelId={channelId}
            campaignId={campaignId ?? null}
            draftStorageKey={`vibey-channel-draft:${channelId}:thread:${parentMessageId}`}
            members={members}
            rosterAvatars={rosterAvatars}
            onSend={(payload) => void onSendReply(payload)}
          />
        </div>
      </div>
    </aside>
  )
}
