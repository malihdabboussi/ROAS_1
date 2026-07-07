'use client'

import { RxDoubleArrowLeft } from 'react-icons/rx'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Search, UsersRound, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CONVERSATION_ICON_BUTTON_CLASS =
  'btn-icon-bare hover:bg-hover-subtle shrink-0'

interface SpaceConversationsHeaderProps {
  query: string
  onQueryChange: (query: string) => void
  onBack: () => void
  onNewConversation: () => void
  hideBackButton?: boolean
  hideHeaderBottomBorder?: boolean
  compactHeader?: boolean
  compactSearchOpen: boolean
  onCompactSearchOpenChange: (open: boolean) => void
  onCollapsedChange?: (collapsed: boolean) => void
  showAllAgentsToggle?: boolean
  allAgentsMode?: boolean
  onAllAgentsModeChange?: (enabled: boolean) => void
}

export function SpaceConversationsHeader({
  query,
  onQueryChange,
  onBack,
  onNewConversation,
  hideBackButton,
  hideHeaderBottomBorder,
  compactHeader,
  compactSearchOpen,
  onCompactSearchOpenChange,
  onCollapsedChange,
  showAllAgentsToggle,
  allAgentsMode,
  onAllAgentsModeChange,
}: SpaceConversationsHeaderProps) {
  return (
    <div
      className={cn(
        'gap-spacing-2 p-spacing-3 flex shrink-0 items-center',
        !hideHeaderBottomBorder && 'border-b border-border',
      )}
    >
      {!hideBackButton ? (
        <button
          type="button"
          onClick={onBack}
          className="btn-icon-bare hover:bg-hover-subtle shrink-0"
          aria-label="Back to chat"
          title="Back to chat"
        >
          <ArrowLeft className="icon-sm" />
        </button>
      ) : null}
      {compactHeader ? (
        <div className="gap-spacing-2 group flex min-w-0 flex-1 items-center">
          <div className="body-3 text-foreground min-w-0 flex-1 truncate font-semibold">
            Conversations
          </div>
          <div
            className={cn(
              'gap-spacing-0 flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
              compactSearchOpen
                ? 'pointer-events-auto translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onCollapsedChange?.(true)}
              className={CONVERSATION_ICON_BUTTON_CLASS}
              aria-label="Collapse conversations"
              title="Collapse conversations"
            >
              <RxDoubleArrowLeft className="icon-sm" aria-hidden />
            </button>
            <motion.div
              initial={false}
              animate={{ width: compactSearchOpen ? 180 : 0, opacity: compactSearchOpen ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="relative w-[180px]">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  placeholder="Search..."
                  className="input-glass body-3 text-foreground h-spacing-8 rounded-spacing-2 py-spacing-1 pl-spacing-3 pr-spacing-8 w-full"
                  autoFocus={compactSearchOpen}
                />
                <button
                  type="button"
                  onClick={() => {
                    onCompactSearchOpenChange(false)
                    onQueryChange('')
                  }}
                  className="btn-icon-bare absolute right-1 top-1/2 -translate-y-1/2"
                  aria-label="Close search"
                  title="Close search"
                >
                  <X className="icon-sm" aria-hidden />
                </button>
              </div>
            </motion.div>
            {!compactSearchOpen ? (
              <button
                type="button"
                onClick={() => onCompactSearchOpenChange(true)}
                className={CONVERSATION_ICON_BUTTON_CLASS}
                aria-label="Search conversations"
                title="Search conversations"
              >
                <Search className="icon-sm" aria-hidden />
              </button>
            ) : null}
            {showAllAgentsToggle ? (
              <button
                type="button"
                onClick={() => onAllAgentsModeChange?.(!allAgentsMode)}
                className={cn(
                  CONVERSATION_ICON_BUTTON_CLASS,
                  allAgentsMode && 'bg-hover-subtle text-foreground',
                )}
                aria-label={
                  allAgentsMode ? 'Show current agent conversations' : 'Show all agent conversations'
                }
                aria-pressed={allAgentsMode}
                title={
                  allAgentsMode ? 'Show current agent conversations' : 'Show all agent conversations'
                }
              >
                <UsersRound className="icon-sm" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onNewConversation}
              className={CONVERSATION_ICON_BUTTON_CLASS}
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus className="icon-sm" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative min-w-0 flex-1">
            <Search className="icon-left-center text-muted-foreground pointer-events-none icon-sm" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search conversations..."
              className="body-4 border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary input-leading box-border h-spacing-8 w-full rounded-spacing-2 border pr-spacing-2 outline-none"
            />
          </div>
          {showAllAgentsToggle ? (
            <button
              type="button"
              onClick={() => onAllAgentsModeChange?.(!allAgentsMode)}
              className={cn(
                CONVERSATION_ICON_BUTTON_CLASS,
                allAgentsMode && 'bg-hover-subtle text-foreground',
              )}
              aria-label={
                allAgentsMode ? 'Show current agent conversations' : 'Show all agent conversations'
              }
              aria-pressed={allAgentsMode}
              title={
                allAgentsMode ? 'Show current agent conversations' : 'Show all agent conversations'
              }
            >
              <UsersRound className="icon-sm" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onNewConversation}
            className="badge-glass badge-glass-green body-4 rounded-spacing-2 h-spacing-8 gap-spacing-1 px-spacing-3 inline-flex shrink-0 items-center font-semibold leading-none transition-opacity hover:opacity-90"
          >
            <Plus className="icon-sm" />
            New
          </button>
        </>
      )}
    </div>
  )
}
