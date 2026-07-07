'use client'

import { ExternalLink, EyeOff, MoreHorizontal } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  ConversationsEmptyIllustration,
  RecentConversationsHiddenIllustration,
} from '@/features/home/components/HomeEmptyIllustrations'
import { stripLegacySpacesConversationTitle } from '@/lib/conversations/conversation-title'
import type { Conversation } from '@/lib/conversations/conversation.types'
import { cn } from '@/lib/utils/cn'

interface RecentAgentConversationsRowsProps {
  loading: boolean
  sortedActiveCount: number
  nonHiddenActiveCount: number
  visibleRows: Conversation[]
  visibleCount: number
  customizeEditing: boolean
  agentAvatarByKey: Map<string, string | null>
  agentDisplayNameByKey: Map<string, string>
  onOpenConversation: (conversation: Conversation) => void
  onOpenConversationNewTab: (conversation: Conversation) => void
  onOpenMenu: (event: React.MouseEvent<HTMLButtonElement>, conversationId: string) => void
  onSetSoftHidden: (id: string, hidden: boolean) => void
  onSeeMore: () => void
}

export function RecentAgentConversationsRows({
  loading,
  sortedActiveCount,
  nonHiddenActiveCount,
  visibleRows,
  visibleCount,
  customizeEditing,
  agentAvatarByKey,
  agentDisplayNameByKey,
  onOpenConversation,
  onOpenConversationNewTab,
  onOpenMenu,
  onSetSoftHidden,
  onSeeMore,
}: RecentAgentConversationsRowsProps) {
  const hasMore = nonHiddenActiveCount > visibleCount

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <VibeyLoadingOrb state="processing" size="sm" />
      </div>
    )
  }

  if (nonHiddenActiveCount === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8">
        {sortedActiveCount === 0 ? (
          <>
            <ConversationsEmptyIllustration />
            <p className="body-3 text-muted-foreground max-w-[240px] text-center">
              No conversations yet across your agents.
            </p>
          </>
        ) : (
          <>
            <RecentConversationsHiddenIllustration />
            <p className="body-3 text-muted-foreground max-w-[240px] text-center">
              All recent conversations are hidden. Use Clear hidden above to show them again.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <ul className="flex-1 space-y-0 overflow-y-auto px-2 py-1">
        {visibleRows.map((conversation) => {
          const title =
            stripLegacySpacesConversationTitle(conversation.title) || 'Untitled conversation'
          const agentKey = conversation.agent_id?.trim() || 'vibey'
          const avatarUrl = agentAvatarByKey.get(agentKey) ?? null
          const agentTooltipLabel =
            agentDisplayNameByKey.get(agentKey) ??
            (agentKey.length > 0 ? agentKey.charAt(0).toUpperCase() + agentKey.slice(1) : 'Agent')
          const initial = (agentKey[0] ?? '?').toUpperCase()

          return (
            <li key={conversation.id}>
              <div
                className={cn(
                  'group/home-recent body-4 text-foreground relative flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 font-medium transition-colors',
                  'hover:bg-hover-subtle',
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpenConversation(conversation)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Tooltip
                    label={agentTooltipLabel}
                    side="top"
                    triggerClassName="inline-flex shrink-0"
                  >
                    <span className="border-border h-6 w-6 shrink-0 overflow-hidden rounded-full border bg-[var(--color-muted)]">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <span className="typo-caption flex h-full w-full items-center justify-center font-semibold leading-none text-[var(--color-muted-foreground)]">
                          {initial}
                        </span>
                      )}
                    </span>
                  </Tooltip>
                  <span className="min-w-0 flex-1 truncate">{title}</span>
                </button>

                {!customizeEditing ? (
                  <div
                    className={cn(
                      'flex shrink-0 items-center gap-0 pr-0 transition-[opacity,transform] duration-200 ease-out',
                      'pointer-events-none translate-x-2 opacity-0',
                      'group-hover/home-recent:pointer-events-auto group-hover/home-recent:translate-x-0 group-hover/home-recent:opacity-100',
                    )}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(event) => onOpenMenu(event, conversation.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-md p-1 transition-colors"
                      aria-label="Conversation actions"
                      aria-haspopup="menu"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onSetSoftHidden(conversation.id, true)
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-md p-1 transition-colors"
                      aria-label="Hide on home"
                      title="Hide on home"
                    >
                      <EyeOff className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenConversationNewTab(conversation)
                      }}
                      className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-md p-1 transition-colors"
                      aria-label="Open in new tab"
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      {hasMore ? (
        <div className="border-border shrink-0 border-t px-3 py-1.5">
          <button
            type="button"
            onClick={onSeeMore}
            className="body-4 text-muted-foreground hover:text-foreground w-full rounded-md py-1 text-center font-medium transition-colors"
          >
            See more
          </button>
        </div>
      ) : null}
    </>
  )
}
