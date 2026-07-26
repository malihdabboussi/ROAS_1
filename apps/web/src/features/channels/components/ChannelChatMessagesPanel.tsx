import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { ChannelMember, ChannelMention, ChannelMessage } from '@/lib/channels'
import type { MissionDeliverable } from '@/lib/missions'
import type { TeamRosterEntry } from '@/lib/team'
import { ChannelComposer, type ChannelComposerVisibleState } from './ChannelComposer'
import { ChannelDateSeparator } from './ChannelDateSeparator'
import { ChannelMessageBubble } from './ChannelMessageBubble'

type SenderMeta = { label: string; avatarUrl: string | null }

export function ChannelChatMessagesPanel({
  channelId,
  campaignId,
  members,
  messages,
  pinnedMessages,
  dateGroups,
  repliesByParent,
  senderMeta,
  currentUserId,
  rosterAvatars,
  mentionRoster,
  onEnsureMentionMembers,
  scrollRef,
  onJumpToDate,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onOpenThread,
  onOpenDeliverablePreview,
  onComposerDraftChange,
}: {
  channelId: string
  campaignId?: string | null
  members: ChannelMember[]
  messages: ChannelMessage[]
  pinnedMessages: ChannelMessage[]
  dateGroups: { dateKey: string; label: string; messages: ChannelMessage[] }[]
  repliesByParent: Map<string, ChannelMessage[]>
  senderMeta: Map<string, SenderMeta>
  currentUserId: string | null
  rosterAvatars?: Map<string, string>
  mentionRoster?: TeamRosterEntry[]
  onEnsureMentionMembers?: (mentions: ChannelMention[]) => Promise<boolean>
  scrollRef: RefObject<HTMLDivElement | null>
  onJumpToDate: (dateKey: string) => void
  onSendMessage: (payload: {
    content: string
    mentions: ChannelMention[]
    attachments?: string[]
  }) => Promise<void> | void
  onEditMessage: (messageId: string, content: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
  onOpenThread?: (messageId: string) => void
  onOpenDeliverablePreview?: (deliverable: MissionDeliverable) => void
  onComposerDraftChange: Dispatch<SetStateAction<ChannelComposerVisibleState>>
}) {
  return (
    <>
      {pinnedMessages.length > 0 && (
        <div className="border-border bg-card px-spacing-4 py-spacing-2 border-b">
          <p className="typo-caption text-muted-foreground">
            {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3 md:px-8">
        {dateGroups.map((group) => (
          <div key={group.dateKey}>
            <ChannelDateSeparator
              label={group.label}
              dateKey={group.dateKey}
              onJumpToDate={onJumpToDate}
            />
            {group.messages.map((message) => {
              const replies = repliesByParent.get(message.id)
              const replyCount = replies?.length ?? 0
              const replyAvatars = replies
                ? replies.slice(0, 3).map((r) => ({
                    url: senderMeta.get(r.id)?.avatarUrl ?? null,
                    label: senderMeta.get(r.id)?.label ?? r.sender_id,
                  }))
                : []
              const lastReplyTime = replies?.length
                ? (replies[replies.length - 1]?.created_at ?? null)
                : null
              return (
                <div key={message.id} data-message-id={message.id}>
                  <ChannelMessageBubble
                    message={message}
                    senderLabel={senderMeta.get(message.id)?.label ?? message.sender_id}
                    avatarUrl={senderMeta.get(message.id)?.avatarUrl ?? null}
                    currentUserId={currentUserId}
                    replyCount={replyCount}
                    replyAvatars={replyAvatars}
                    lastReplyTime={lastReplyTime}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                    onOpenThread={onOpenThread ? () => onOpenThread(message.id) : undefined}
                    onOpenDeliverablePreview={onOpenDeliverablePreview}
                  />
                </div>
              )
            })}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="body-3 text-muted-foreground">No messages yet. Start the conversation.</p>
        )}
      </div>

      <div className="shrink-0 p-3 pt-0">
        <ChannelComposer
          channelId={channelId}
          campaignId={campaignId ?? null}
          draftStorageKey={`vibey-channel-draft:${channelId}:main`}
          members={members}
          rosterAvatars={rosterAvatars}
          mentionRoster={mentionRoster}
          onBeforeSend={(payload) =>
            onEnsureMentionMembers
              ? onEnsureMentionMembers(payload.mentions)
              : Promise.resolve(true)
          }
          onSend={(payload) => void onSendMessage(payload)}
          onVisibleStateChange={onComposerDraftChange}
        />
      </div>
    </>
  )
}
