'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import type { ChannelMessage } from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import { ChannelAgentStatusBadges } from './ChannelAgentStatusBadges'
import { ChannelMessageActions } from './ChannelMessageActions'
import { ChannelMessageAvatar } from './ChannelMessageAvatar'
import { ChannelMessageBody } from './ChannelMessageBody'
import {
  ChannelMessageReactionBadge,
  type ChannelMessageReaction,
} from './ChannelMessageReactions'
import {
  formatChannelMessageTime,
  isChannelMessageHtml,
  stripChannelMessageHtml,
} from './channel-message-bubble-utils'

export {
  THINKING_PHASES,
  getChannelMessageOrbState as getOrbState,
} from './channel-message-bubble-utils'

export function ChannelMessageBubble({
  message,
  senderLabel,
  avatarUrl,
  currentUserId,
  replyCount = 0,
  replyAvatars = [],
  lastReplyTime,
  onEdit,
  onDelete,
  onOpenThread,
  onOpenDeliverablePreview,
  compact = false,
  hideActiveBadges = false,
}: {
  message: ChannelMessage
  senderLabel: string
  avatarUrl: string | null
  currentUserId: string | null
  replyCount?: number
  replyAvatars?: { url: string | null; label: string }[]
  lastReplyTime?: string | null
  onEdit: (messageId: string, newContent: string) => Promise<void>
  onDelete: (messageId: string) => Promise<void>
  onOpenThread?: () => void
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  compact?: boolean
  hideActiveBadges?: boolean
}) {
  const isAgent = message.sender_type === 'agent'
  const isSystem = message.sender_type === 'system'
  const rawContent = message.content?.trim() ?? ''
  const isOwn = message.sender_type === 'user' && message.sender_id === currentUserId
  const [reactions, setReactions] = useState<ChannelMessageReaction[]>([])
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleReaction = (key: string) => {
    setReactions((prev) => {
      const existing = prev.find((reaction) => reaction.key === key)
      if (existing) {
        return prev
          .map((reaction) =>
            reaction.key === key
              ? {
                  ...reaction,
                  count: reaction.byMe ? reaction.count - 1 : reaction.count + 1,
                  byMe: !reaction.byMe,
                }
              : reaction,
          )
          .filter((reaction) => reaction.count > 0)
      }
      return [...prev, { key, count: 1, byMe: true }]
    })
  }

  const startEdit = () => {
    setEditValue(isChannelMessageHtml(rawContent) ? stripChannelMessageHtml(rawContent) : rawContent)
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditValue('')
  }

  const saveEdit = async () => {
    if (!editValue.trim()) return
    setSaving(true)
    try {
      await onEdit(message.id, editValue.trim())
      setEditing(false)
    } catch {
      toast.error('Could not save edit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={`group relative flex min-w-0 items-start gap-3 rounded-lg ${compact ? 'px-0 py-1.5' : 'px-2 py-1.5'} transition-colors ${editing ? '' : 'hover:bg-hover-subtle'}`}
    >
      <div className="shrink-0">
        <ChannelMessageAvatar
          senderLabel={senderLabel}
          avatarUrl={avatarUrl}
          isAgent={isAgent}
          isSystem={isSystem}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className="body-3 text-foreground font-semibold leading-tight">{senderLabel}</span>
          <time
            className="typo-caption text-muted-foreground shrink-0"
            dateTime={message.created_at}
          >
            {formatChannelMessageTime(message.created_at)}
          </time>
        </div>

        {editing ? (
          <div>
            <textarea
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void saveEdit()
                }
                if (event.key === 'Escape') cancelEdit()
              }}
              rows={2}
              autoFocus
              className="bg-background body-3 text-foreground border-primary/30 focus-visible:border-primary/45 w-full resize-none rounded-lg border px-3 py-2 shadow-none outline-none ring-0 ring-offset-0 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="button-glass-neutral rounded px-3 py-1 text-xs font-medium outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={saving}
                className="button-glass-accent rounded px-3 py-1 text-xs font-medium outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <ChannelMessageBody
            message={message}
            rawContent={rawContent}
            onOpenDeliverablePreview={onOpenDeliverablePreview}
          />
        )}

        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactions.map((reaction) => (
              <ChannelMessageReactionBadge
                key={reaction.key}
                reaction={reaction}
                onToggle={() => toggleReaction(reaction.key)}
              />
            ))}
          </div>
        )}

        <ChannelAgentStatusBadges
          metadata={message.metadata}
          channelId={message.channel_id}
          messageId={message.id}
          hideActive={hideActiveBadges}
        />

        {replyCount > 0 && !compact && onOpenThread && (
          <button
            type="button"
            onClick={onOpenThread}
            className="hover:bg-primary/5 group/thread mt-1 flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors"
          >
            <div className="flex -space-x-1.5">
              {replyAvatars.slice(0, 3).map((avatar, index) =>
                avatar.url ? (
                  <img
                    key={index}
                    src={avatar.url}
                    alt={avatar.label}
                    className="border-background h-5 w-5 rounded-full border object-cover"
                  />
                ) : (
                  <span
                    key={index}
                    className="typo-caption bg-muted text-muted-foreground border-background inline-flex h-5 w-5 items-center justify-center rounded-full border font-semibold uppercase"
                  >
                    {avatar.label.charAt(0)}
                  </span>
                ),
              )}
            </div>
            <span className="text-primary body-4 font-medium group-hover/thread:underline">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {lastReplyTime && (
              <span className="typo-caption text-muted-foreground">
                {formatChannelMessageTime(lastReplyTime)}
              </span>
            )}
            <MessageSquare className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover/thread:opacity-100" />
          </button>
        )}
      </div>

      {!editing && (
        <ChannelMessageActions
          messageId={message.id}
          rawContent={rawContent}
          isOwn={isOwn}
          onStartEdit={startEdit}
          onDelete={onDelete}
          onToggleReaction={toggleReaction}
        />
      )}
    </div>
  )
}
