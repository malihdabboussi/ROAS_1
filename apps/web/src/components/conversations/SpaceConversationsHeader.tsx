'use client'

import type { ReactNode } from 'react'
import { RxDoubleArrowLeft } from 'react-icons/rx'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Search, UsersRound, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CONVERSATION_ICON_BUTTON_CLASS = 'btn-icon-bare hover:bg-hover-subtle shrink-0'

interface SpaceConversationsHeaderProps {
  query: string
  onQueryChange: (query: string) => void
  onBack: () => void
  onNewConversation: () => void
  hideBackButton?: boolean
  hideHeaderBottomBorder?: boolean
  /** Hide the green New control when another surface already owns new-chat. */
  hideNewButton?: boolean
  /** Omit inline list search when a parent surface owns search. */
  hideSearch?: boolean
  /**
   * Parent-owned search control rendered after agent/filter controls
   * (e.g. shell Studio search). Used when `hideSearch` is true.
   */
  searchSlot?: ReactNode
  /** Extra controls after all-agents, before search (e.g. list filter). */
  headerEndSlot?: ReactNode
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
  hideNewButton,
  hideSearch,
  searchSlot,
  headerEndSlot,
  compactHeader,
  compactSearchOpen,
  onCompactSearchOpenChange,
  onCollapsedChange,
  showAllAgentsToggle,
  allAgentsMode,
  onAllAgentsModeChange,
}: SpaceConversationsHeaderProps) {
  const allAgentsButton = showAllAgentsToggle ? (
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
      title={allAgentsMode ? 'Show current agent conversations' : 'Show all agent conversations'}
    >
      <UsersRound className="icon-sm" aria-hidden />
    </button>
  ) : null

  const inlineSearch = !hideSearch ? (
    hideHeaderBottomBorder ? (
      <label className="hub-menu-link-row text-muted-foreground relative min-w-0 flex-1 cursor-text">
        <Search className="shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
    ) : (
      <div className="relative min-w-0 flex-1">
        <Search className="icon-left-center text-muted-foreground icon-sm pointer-events-none" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="input-glass body-3 text-foreground placeholder:text-muted-foreground h-spacing-8 rounded-spacing-2 py-spacing-1 pl-spacing-8 pr-spacing-2 box-border w-full outline-none"
        />
      </div>
    )
  ) : searchSlot ? (
    <div className="min-w-0 flex-1">{searchSlot}</div>
  ) : null

  return (
    <div
      className={cn(
        'gap-spacing-2 flex shrink-0 items-center',
        hideHeaderBottomBorder ? 'pb-spacing-1' : 'p-spacing-3 border-border border-b',
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
              compactSearchOpen || hideSearch
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
            {allAgentsButton}
            {headerEndSlot}
            {!hideSearch ? (
              <>
                <motion.div
                  initial={false}
                  animate={{
                    width: compactSearchOpen ? 180 : 0,
                    opacity: compactSearchOpen ? 1 : 0,
                  }}
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
              </>
            ) : null}
            {!hideNewButton ? (
              <button
                type="button"
                onClick={onNewConversation}
                className={CONVERSATION_ICON_BUTTON_CLASS}
                aria-label="New conversation"
                title="New conversation"
              >
                <Plus className="icon-sm" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : hideHeaderBottomBorder ? (
        <>
          {inlineSearch}
          {allAgentsButton}
          {headerEndSlot}
        </>
      ) : (
        <>
          {allAgentsButton}
          {headerEndSlot}
          {inlineSearch}
          {!hideNewButton ? (
            <button
              type="button"
              onClick={onNewConversation}
              className="badge-glass badge-glass-green body-4 rounded-spacing-2 h-spacing-8 gap-spacing-1 px-spacing-3 inline-flex shrink-0 items-center font-semibold leading-none transition-opacity hover:opacity-90"
            >
              <Plus className="icon-sm" />
              New
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
