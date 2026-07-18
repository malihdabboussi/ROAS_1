'use client'

import { RxDoubleArrowLeft } from 'react-icons/rx'
import { motion } from 'framer-motion'
import { GitBranch, List, Lock, Plus, Search, X } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/lib/team'
import { cn } from '@/lib/utils/cn'
import { TeamHrChatAgentIdentity } from './TeamHrChatAgentIdentity'

interface TeamHrChatHeaderProps {
  activeAgentName: string
  hrRosterEntry: TeamRosterEntry | null
  focusedAgent: { name: string; editable: boolean } | null
  sessionTitle: string | null
  searchOpen: boolean
  searchQuery: string
  showCheckpoints: boolean
  onCollapseChat?: () => void
  onSearchOpenChange: (open: boolean) => void
  onSearchQueryChange: (query: string) => void
  onNewConversation: () => void
  onShowCheckpoints: () => void
  onShowConversations: () => void
}

export function TeamHrChatHeader({
  activeAgentName,
  hrRosterEntry,
  focusedAgent,
  sessionTitle,
  searchOpen,
  searchQuery,
  showCheckpoints,
  onCollapseChat,
  onSearchOpenChange,
  onSearchQueryChange,
  onNewConversation,
  onShowCheckpoints,
  onShowConversations,
}: TeamHrChatHeaderProps) {
  const chatHeaderActions = (
    <div
      className={cn(
        'gap-spacing-0 flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
        searchOpen
          ? 'pointer-events-auto translate-x-0 opacity-100'
          : 'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onCollapseChat?.()}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label={`Collapse ${activeAgentName} chat`}
        title={`Collapse ${activeAgentName} chat`}
      >
        <RxDoubleArrowLeft className="icon-sm" aria-hidden />
      </button>
      <motion.div
        initial={false}
        animate={{ width: searchOpen ? 180 : 0, opacity: searchOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="shrink-0 overflow-hidden"
      >
        <div className="relative w-[180px]">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search..."
            className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-8 w-full"
            autoFocus={searchOpen}
          />
          <button
            type="button"
            onClick={() => {
              onSearchOpenChange(false)
              onSearchQueryChange('')
            }}
            className="text-muted-foreground hover:text-foreground absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors"
            aria-label="Close search"
            title="Close search"
          >
            <X className="icon-sm" />
          </button>
        </div>
      </motion.div>
      {!searchOpen ? (
        <button
          type="button"
          onClick={() => onSearchOpenChange(true)}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
          aria-label="Search in conversation"
          title="Search"
        >
          <Search className="icon-sm" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => void onNewConversation()}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label="New conversation"
        title="New conversation"
      >
        <Plus className="icon-sm" />
      </button>
      {showCheckpoints && focusedAgent?.editable ? (
        <button
          type="button"
          onClick={onShowCheckpoints}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
          aria-label={`History for ${focusedAgent.name}`}
          title={`History · ${focusedAgent.name}`}
        >
          <GitBranch className="icon-sm" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onShowConversations}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label="Show conversations"
        title="Conversations"
      >
        <List className="icon-sm" />
      </button>
    </div>
  )

  return (
    <div className="pt-spacing-2 pb-spacing-1 relative shrink-0 px-3 md:px-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="min-h-spacing-10 gap-spacing-2 group flex items-center">
          <div className="flex shrink-0 items-center">
            {hrRosterEntry ? <TeamHrChatAgentIdentity entry={hrRosterEntry} /> : null}
          </div>
          {focusedAgent ? (
            <div className="px-spacing-2 min-w-0 flex-1 text-center leading-tight">
              <span
                className={cn(
                  'badge-glass body-4 rounded-spacing-2 px-spacing-2 gap-spacing-1 inline-flex max-w-full items-center truncate py-0.5 font-medium',
                  focusedAgent.editable ? 'badge-glass-orange' : 'badge-glass-muted',
                )}
              >
                {focusedAgent.editable ? null : <Lock className="icon-xs shrink-0" aria-hidden />}
                {focusedAgent.editable
                  ? `Editing ${focusedAgent.name}`
                  : `${focusedAgent.name} · read-only`}
              </span>
            </div>
          ) : sessionTitle ? (
            <Tooltip label={sessionTitle} side="bottom" wide triggerClassName="flex min-w-0 flex-1">
              <div className="body-3 text-muted-foreground px-spacing-2 w-full min-w-0 truncate text-center leading-tight">
                {sessionTitle}
              </div>
            </Tooltip>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex shrink-0 items-center">{chatHeaderActions}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 translate-y-full bg-gradient-to-b from-[var(--color-background)] to-transparent" />
    </div>
  )
}
