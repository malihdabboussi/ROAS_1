'use client'

import { RxDoubleArrowLeft } from 'react-icons/rx'
import { motion } from 'framer-motion'
import { List, ListTodo, Plus, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SpaceChatHeaderActionsProps {
  searchOpen: boolean
  searchQuery: string
  voiceActive: boolean
  hasVoiceTasks: boolean
  hasRunningVoiceTasks: boolean
  onCollapse: () => void
  onSearchOpen: () => void
  onSearchClose: () => void
  onSearchQueryChange: (value: string) => void
  onNewConversation: () => void
  onShowVoiceRuns: () => void
  onShowConversations: () => void
}

export function SpaceChatHeaderActions({
  searchOpen,
  searchQuery,
  voiceActive,
  hasVoiceTasks,
  hasRunningVoiceTasks,
  onCollapse,
  onSearchOpen,
  onSearchClose,
  onSearchQueryChange,
  onNewConversation,
  onShowVoiceRuns,
  onShowConversations,
}: SpaceChatHeaderActionsProps) {
  return (
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
        onClick={onCollapse}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
        aria-label="Collapse ROAS chat"
        title="Collapse ROAS chat"
      >
        <RxDoubleArrowLeft className="icon-sm" aria-hidden />
      </button>
      <motion.div
        initial={false}
        animate={{ width: searchOpen ? 192 : 0, opacity: searchOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="shrink-0 overflow-hidden"
      >
        <div className="w-spacing-48 relative">
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
            onClick={onSearchClose}
            className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 absolute right-0 top-1/2 flex -translate-y-1/2 items-center justify-center transition-colors"
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
          onClick={onSearchOpen}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
          aria-label="Search in conversation"
          title="Search"
        >
          <Search className="icon-sm" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNewConversation}
        disabled={voiceActive}
        className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="New conversation"
        title="New conversation"
      >
        <Plus className="icon-sm" />
      </button>
      {voiceActive || hasVoiceTasks ? (
        <button
          type="button"
          onClick={onShowVoiceRuns}
          className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 relative flex shrink-0 items-center justify-center transition-colors"
          aria-label="Show tasks and runs"
          title="Tasks & Runs"
        >
          <ListTodo className="icon-sm" />
          {hasRunningVoiceTasks ? (
            <span className="status-dot-glass tintbg-amber absolute right-1 top-1" />
          ) : null}
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
}
