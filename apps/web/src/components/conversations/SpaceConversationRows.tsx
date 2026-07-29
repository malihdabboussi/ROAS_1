'use client'

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { MoreHorizontal, Pin } from 'lucide-react'
import { ConversationChannelIcon } from '@/components/chat/ConversationChannelIcon'
import { Tooltip } from '@/components/ui/tooltip'
import {
  formatCompactRelativeTime,
  getAgentInitial,
  getConversationAgentDisplay,
  needsGeneratedConversationTitle,
  resolveConversationActivity,
  stripLegacySpacesConversationTitle,
  type ChatHistoryLeadingIcon,
  type Conversation,
  type ConversationActivity,
  type ConversationAgentDisplay,
} from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'
import { ConversationActivityIndicator } from './ConversationActivityIndicator'

export interface ConversationRowRuntimeState {
  isRunning: boolean
  phase?: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'
  toolLabel?: string | null
  statusMessage?: string | null
}

function ConversationRowLeadingIcon({
  conversation,
  leadingIcon,
  activity,
  agentByKey,
}: {
  conversation: Conversation
  leadingIcon: ChatHistoryLeadingIcon
  activity: ConversationActivity
  agentByKey?: Record<string, ConversationAgentDisplay>
}) {
  if (leadingIcon === 'none') return null
  if (leadingIcon === 'agent') {
    return <ConversationAgentAvatar conversation={conversation} agentByKey={agentByKey} />
  }
  if (leadingIcon === 'status') {
    return <ConversationActivityIndicator activity={activity} />
  }
  // logo — channel mark when present; otherwise the current activity state
  const source = conversation.metadata?.source
  if (source === 'slack' || source === 'telegram') {
    return <ConversationChannelIcon metadata={conversation.metadata} />
  }
  return <ConversationActivityIndicator activity={activity} />
}

function ConversationRowTitle({
  rawTitle,
  emphasized,
}: {
  rawTitle: string | null
  emphasized: boolean
}) {
  const target = stripLegacySpacesConversationTitle(rawTitle) || 'Untitled conversation'
  const [shown, setShown] = useState(target)
  const prevTargetRef = useRef(target)

  useEffect(() => {
    const prev = prevTargetRef.current
    if (target === prev) return
    prevTargetRef.current = target

    const prevWasDraft = prev === 'Untitled conversation' || needsGeneratedConversationTitle(prev)
    const targetIsDraft =
      target === 'Untitled conversation' || needsGeneratedConversationTitle(target)

    // Typewriter only when a raw/placeholder title upgrades to a short topic label.
    if (!prevWasDraft || targetIsDraft) {
      setShown(target)
      return
    }

    let cancelled = false
    let index = 0
    setShown('')
    const tick = () => {
      if (cancelled) return
      index += 1
      setShown(target.slice(0, index))
      if (index < target.length) {
        window.setTimeout(tick, 18)
      }
    }
    tick()
    return () => {
      cancelled = true
    }
  }, [target])

  return (
    <p className={cn('body-3 truncate', emphasized ? 'font-semibold' : 'font-medium')}>{shown}</p>
  )
}

function formatConversationUpdatedAt(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
}

function ConversationAgentAvatar({
  conversation,
  agentByKey,
}: {
  conversation: Conversation
  agentByKey?: Record<string, ConversationAgentDisplay>
}) {
  const agent = getConversationAgentDisplay(conversation, agentByKey)
  return (
    <Tooltip label={agent.name} side="right">
      <span className="border-subtle bg-secondary icon-md flex shrink-0 items-center justify-center overflow-hidden rounded-full">
        {agent.avatarUrl ? (
          <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="typo-xs text-muted-foreground font-semibold">
            {getAgentInitial(agent.name)}
          </span>
        )}
      </span>
    </Tooltip>
  )
}

function ConversationRowSubtitle({ runtimeState }: { runtimeState?: ConversationRowRuntimeState }) {
  if (!runtimeState?.isRunning) return null
  const phase = runtimeState.phase ?? 'idle'
  const toolLabel = runtimeState.toolLabel ?? null
  const statusMessage = runtimeState.statusMessage ?? null
  let subtitle: string | null = null
  if (phase === 'executing' && toolLabel) subtitle = toolLabel
  else if (phase === 'thinking') subtitle = statusMessage ?? 'Thinking…'
  else if (phase === 'streaming') subtitle = 'Writing…'
  else if (statusMessage) subtitle = statusMessage
  if (!subtitle) return null
  return <p className="body-4 text-muted-foreground/70 truncate">{subtitle}</p>
}

interface SpaceConversationRowProps {
  conversation: Conversation
  section: string
  selected: boolean
  pinned: boolean
  renaming: boolean
  renameDraft: string
  showSubtitle: boolean
  runtimeState?: ConversationRowRuntimeState
  /** @deprecated Prefer `leadingIcon="agent"`. Kept for Spaces callers. */
  allAgentsMode?: boolean
  leadingIcon?: ChatHistoryLeadingIcon
  agentByKey?: Record<string, ConversationAgentDisplay>
  menuOpen: boolean
  renameInputRef: RefObject<HTMLInputElement | null>
  onSelectConversation: (conversationId: string) => void
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>, conversationId: string) => void
  onOpenContextMenu: (event: MouseEvent<HTMLDivElement>, conversationId: string) => void
  onRenameDraftChange: (value: string) => void
  onSubmitRename: () => void | Promise<void>
  onCancelRename: () => void
  showUpdatedAt?: boolean
  divided?: boolean
}

export function SpaceConversationRow({
  conversation,
  selected,
  pinned,
  renaming,
  renameDraft,
  showSubtitle,
  runtimeState,
  allAgentsMode,
  leadingIcon,
  agentByKey,
  menuOpen,
  renameInputRef,
  onSelectConversation,
  onOpenMenu,
  onOpenContextMenu,
  onRenameDraftChange,
  onSubmitRename,
  onCancelRename,
  showUpdatedAt = false,
  divided = false,
}: SpaceConversationRowProps) {
  const resolvedLeadingIcon: ChatHistoryLeadingIcon =
    leadingIcon ?? (allAgentsMode ? 'agent' : 'logo')
  const showLeadingSlot = resolvedLeadingIcon !== 'none'
  const activity = resolveConversationActivity({
    status: conversation.status,
    needsAction: conversation.needs_action,
    isRunning: runtimeState?.isRunning,
    isUnread: conversation.is_unread,
  })
  const source = conversation.metadata?.source
  const leadingRendersActivity =
    resolvedLeadingIcon === 'status' ||
    (resolvedLeadingIcon === 'logo' && source !== 'slack' && source !== 'telegram')
  const showSeparateActivity = activity !== 'idle' && !leadingRendersActivity
  const relativeAge = formatCompactRelativeTime(conversation.updated_at)
  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(event, conversation.id)}
      title={conversation.updated_at}
      className={cn(
        'group/conversation px-spacing-1 py-spacing-1 gap-spacing-2 rounded-spacing-3 relative flex items-center transition-colors',
        divided && 'border-border rounded-none border-b',
        selected
          ? 'bg-hover-subtle text-foreground'
          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
        menuOpen && 'bg-hover-subtle text-foreground',
      )}
    >
      {showSeparateActivity ? <ConversationActivityIndicator activity={activity} /> : null}
      {showLeadingSlot ? (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center',
            resolvedLeadingIcon === 'agent' ? 'icon-md' : 'icon-sm',
          )}
        >
          <ConversationRowLeadingIcon
            conversation={conversation}
            leadingIcon={resolvedLeadingIcon}
            activity={activity}
            agentByKey={agentByKey}
          />
        </div>
      ) : null}
      {renaming ? (
        <input
          ref={renameInputRef}
          value={renameDraft}
          onChange={(event) => onRenameDraftChange(event.target.value)}
          onBlur={() => void onSubmitRename()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void onSubmitRename()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              onCancelRename()
            }
          }}
          className="body-3 border-primary bg-background text-foreground rounded-spacing-1 px-spacing-1 py-spacing-1 min-w-0 flex-1 border font-medium outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelectConversation(conversation.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="gap-spacing-1 flex min-w-0 items-center">
            {pinned ? <Pin className="text-muted-foreground icon-xs shrink-0" /> : null}
            <ConversationRowTitle
              rawTitle={conversation.title}
              emphasized={activity === 'needs_action' || activity === 'unread'}
            />
          </div>
          {showSubtitle ? <ConversationRowSubtitle runtimeState={runtimeState} /> : null}
        </button>
      )}
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-end',
          showUpdatedAt ? 'w-spacing-20 h-6' : 'w-spacing-10 h-6',
        )}
      >
        <span
          className={cn(
            'text-muted-foreground tabular-nums transition-opacity',
            showUpdatedAt ? 'body-4' : 'typo-caption',
            menuOpen ? 'opacity-0' : 'group-hover/conversation:opacity-0',
          )}
        >
          {showUpdatedAt ? formatConversationUpdatedAt(conversation.updated_at) : relativeAge}
        </span>
        <button
          type="button"
          onClick={(event) => onOpenMenu(event, conversation.id)}
          className={cn(
            'text-muted-foreground hover:text-foreground bg-hover-subtle rounded-spacing-1 absolute inset-y-0 right-0 flex items-center justify-center p-1 transition-opacity',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover/conversation:opacity-100',
          )}
          aria-label="Conversation actions"
          aria-haspopup="menu"
        >
          <MoreHorizontal className="icon-sm" />
        </button>
      </span>
    </div>
  )
}
