'use client'

import { useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react'
import { CheckCircle2, MoreHorizontal, Pin } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { VibeyChatOrb } from '@/components/vibey/vibey-chat-orb'
import {
  getAgentInitial,
  getConversationAgentDisplay,
  stripLegacySpacesConversationTitle,
  type Conversation,
  type ConversationAgentDisplay,
  type ConversationSection,
} from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'

export interface ConversationRowRuntimeState {
  isRunning: boolean
  phase?: 'idle' | 'thinking' | 'executing' | 'streaming' | 'complete'
  toolLabel?: string | null
  statusMessage?: string | null
}

function ConversationRowStateIcon({
  runtimeState,
}: {
  runtimeState?: ConversationRowRuntimeState
}) {
  if (runtimeState?.isRunning) {
    return <VibeyChatOrb state="processing" className="vibey-chat-orb--neutral" />
  }
  return <CheckCircle2 className="text-muted-foreground icon-sm shrink-0" />
}

function ConversationRowTitle({ rawTitle }: { rawTitle: string | null }) {
  const target = stripLegacySpacesConversationTitle(rawTitle) || 'Untitled conversation'
  const [shown, setShown] = useState(target)
  const prevTargetRef = useRef(target)

  useEffect(() => {
    const prev = prevTargetRef.current
    if (target === prev) return
    prevTargetRef.current = target

    const prevWasPlaceholder = prev === 'Untitled conversation'
    const targetIsPlaceholder = target === 'Untitled conversation'

    if (!prevWasPlaceholder || targetIsPlaceholder) {
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

  return <p className="body-3 truncate font-medium">{shown}</p>
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

function ConversationRowSubtitle({
  runtimeState,
}: {
  runtimeState?: ConversationRowRuntimeState
}) {
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
  section: ConversationSection
  selected: boolean
  pinned: boolean
  renaming: boolean
  renameDraft: string
  showSubtitle: boolean
  runtimeState?: ConversationRowRuntimeState
  allAgentsMode?: boolean
  agentByKey?: Record<string, ConversationAgentDisplay>
  menuOpen: boolean
  renameInputRef: RefObject<HTMLInputElement | null>
  onSelectConversation: (conversationId: string) => void
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>, conversationId: string) => void
  onOpenContextMenu: (event: MouseEvent<HTMLDivElement>, conversationId: string) => void
  onRenameDraftChange: (value: string) => void
  onSubmitRename: () => void | Promise<void>
  onCancelRename: () => void
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
  agentByKey,
  menuOpen,
  renameInputRef,
  onSelectConversation,
  onOpenMenu,
  onOpenContextMenu,
  onRenameDraftChange,
  onSubmitRename,
  onCancelRename,
}: SpaceConversationRowProps) {
  return (
    <div
      onContextMenu={(event) => onOpenContextMenu(event, conversation.id)}
      className={cn(
        'group/conversation px-spacing-2 py-spacing-1 gap-spacing-2 flex items-start rounded-spacing-3 transition-colors',
        selected
          ? 'bg-hover-subtle text-foreground'
          : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
        menuOpen && 'bg-hover-subtle text-foreground',
      )}
    >
      {allAgentsMode ? (
        <div className="mt-spacing-0-5 flex shrink-0 items-center justify-center">
          <ConversationAgentAvatar conversation={conversation} agentByKey={agentByKey} />
        </div>
      ) : (
        <div className="mt-spacing-0-5 icon-sm flex shrink-0 items-center justify-center">
          <ConversationRowStateIcon runtimeState={runtimeState} />
        </div>
      )}
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
          className="body-3 border-primary bg-background text-foreground min-w-0 flex-1 rounded-spacing-1 border px-spacing-1 py-spacing-1 font-medium outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onSelectConversation(conversation.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="gap-spacing-1 flex min-w-0 items-center">
            {pinned ? <Pin className="text-muted-foreground icon-xs shrink-0" /> : null}
            <ConversationRowTitle rawTitle={conversation.title} />
          </div>
          {showSubtitle ? <ConversationRowSubtitle runtimeState={runtimeState} /> : null}
        </button>
      )}
      <button
        type="button"
        onClick={(event) => onOpenMenu(event, conversation.id)}
        className={cn(
          'text-muted-foreground hover:bg-hover-subtle hover:text-foreground mt-spacing-0-5 rounded-spacing-1 p-spacing-1 transition-opacity',
          menuOpen ? 'opacity-100' : 'opacity-0 group-hover/conversation:opacity-100',
        )}
        aria-label="Conversation actions"
        aria-haspopup="menu"
      >
        <MoreHorizontal className="icon-sm" />
      </button>
    </div>
  )
}
