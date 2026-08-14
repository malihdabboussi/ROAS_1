'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { RxDoubleArrowLeft } from 'react-icons/rx'
import { ArrowLeft, ChevronDown, ChevronRight, Plus, Search, UsersRound, X } from 'lucide-react'
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
  /** Render New as a full-width row under the search/filter toolbar. */
  newButtonBelowSearch?: boolean
  /** Omit inline list search when a parent surface owns search. */
  hideSearch?: boolean
  /** Extra controls before all-agents (e.g. pop-out to All Chats). */
  headerStartSlot?: ReactNode
  /** Parent-owned search control when `hideSearch` is true. */
  searchSlot?: ReactNode
  /** Extra controls after all-agents, before search (e.g. list filter). */
  headerEndSlot?: ReactNode
  /** Active query constraints shown below the New chat control. */
  headerFooterSlot?: ReactNode
  compactHeader?: boolean
  compactHeaderTitle?: string
  compactHeaderTitleClassName?: string
  compactHeaderTitleExpanded?: boolean
  onCompactHeaderTitleClick?: () => void
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
  newButtonBelowSearch,
  hideSearch,
  searchSlot,
  headerStartSlot,
  headerEndSlot,
  headerFooterSlot,
  compactHeader,
  compactHeaderTitle = 'Conversations',
  compactHeaderTitleClassName,
  compactHeaderTitleExpanded = true,
  onCompactHeaderTitleClick,
  compactSearchOpen,
  onCompactSearchOpenChange,
  onCollapsedChange,
  showAllAgentsToggle,
  allAgentsMode,
  onAllAgentsModeChange,
}: SpaceConversationsHeaderProps) {
  const showInlineNew = !hideNewButton && !newButtonBelowSearch
  const showBelowNew = !hideNewButton && newButtonBelowSearch
  const compactInlineSearchRef = useRef<HTMLLabelElement>(null)
  const compactSearchRowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!hideHeaderBottomBorder || !compactSearchOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (
        compactInlineSearchRef.current?.contains(event.target as Node) ||
        compactSearchRowRef.current?.contains(event.target as Node)
      ) return
      onCompactSearchOpenChange(false)
      onQueryChange('')
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [compactSearchOpen, hideHeaderBottomBorder, onCompactSearchOpenChange, onQueryChange])
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
      compactSearchOpen ? (
        <label
          ref={compactInlineSearchRef}
          className="text-muted-foreground gap-spacing-1 flex min-w-0 flex-1 cursor-text items-center"
        >
          <Search className="icon-sm shrink-0" aria-hidden />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
            autoFocus
            className="body-4 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => onCompactSearchOpenChange(true)}
          className="btn-icon-bare hover:bg-hover-subtle shrink-0"
          aria-label="Search conversations"
          title="Search conversations"
        >
          <Search className="icon-sm" aria-hidden />
        </button>
      )
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
  const belowSearchNew = showBelowNew ? (
    <button
      type="button"
      onClick={onNewConversation}
      className="button-glass-primary body-3 rounded-spacing-2 mt-spacing-2 h-spacing-8 gap-spacing-1 inline-flex w-full items-center justify-center font-semibold"
      aria-label="New chat"
      title="New chat"
    >
      <Plus className="icon-sm" aria-hidden />
      <span>New chat</span>
    </button>
  ) : null
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col',
        hideHeaderBottomBorder
          ? compactHeader
            ? onCompactHeaderTitleClick
              ? 'px-spacing-3 pb-spacing-1'
              : 'px-spacing-2 pb-spacing-1'
            : 'pb-spacing-1'
          : 'p-spacing-3 border-border border-b',
      )}
    >
      <div className="gap-spacing-2 flex items-center">
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
            {headerStartSlot}
            {onCompactHeaderTitleClick ? (
              <button
                type="button"
                className={cn(
                  'hub-menu-section-label gap-spacing-1 group/title !mb-0 flex min-w-0 items-center text-left',
                  compactHeaderTitleClassName,
                )}
                aria-expanded={compactHeaderTitleExpanded}
                onClick={onCompactHeaderTitleClick}
              >
                {compactHeaderTitle}
                {compactHeaderTitleExpanded ? (
                  <ChevronDown
                    className="icon-xs opacity-0 transition-opacity group-focus-within/title:opacity-100 group-hover/title:opacity-100"
                    aria-hidden
                  />
                ) : (
                  <ChevronRight
                    className="icon-xs opacity-0 transition-opacity group-focus-within/title:opacity-100 group-hover/title:opacity-100"
                    aria-hidden
                  />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  'body-3 text-foreground min-w-0 flex-1 truncate font-semibold',
                  compactHeaderTitleClassName,
                )}
              >
                {compactHeaderTitle}
              </div>
            )}
            <div
              className={cn(
                'gap-spacing-0 ml-auto flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
                compactSearchOpen || hideSearch
                  ? 'pointer-events-auto translate-x-0 opacity-100'
                  : 'pointer-events-none translate-x-4 opacity-0 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100',
              )}
              onClick={(event) => event.stopPropagation()}
            >
              {onCollapsedChange ? (
                <button
                  type="button"
                  onClick={() => onCollapsedChange(true)}
                  className={CONVERSATION_ICON_BUTTON_CLASS}
                  aria-label="Collapse conversations"
                  title="Collapse conversations"
                >
                  <RxDoubleArrowLeft className="icon-sm" aria-hidden />
                </button>
              ) : null}
              {allAgentsButton}
              {headerEndSlot}
              {!hideSearch && !compactSearchOpen ? (
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
              {showInlineNew ? (
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
          <div className="group/chat-history-header gap-spacing-1 flex min-w-0 flex-1 items-center">
            {inlineSearch}
            <div className="gap-spacing-1 ml-auto flex shrink-0 items-center">
              {headerStartSlot}
              {headerEndSlot}
              {showInlineNew ? (
                <button
                  type="button"
                  onClick={onNewConversation}
                  className="button-compact button-glass-primary gap-spacing-1 shrink-0"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus className="icon-sm" aria-hidden />
                  <span>New</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {headerStartSlot}
            {allAgentsButton}
            {headerEndSlot}
            {inlineSearch}
            {showInlineNew ? (
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
      {compactHeader && compactSearchOpen && !hideSearch ? (
        <div
          ref={compactSearchRowRef}
          data-compact-conversation-search
          className="mt-spacing-1 relative w-full"
        >
          <Search className="icon-left-center text-muted-foreground icon-sm pointer-events-none" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="input-glass body-3 text-foreground placeholder:text-muted-foreground h-spacing-8 rounded-spacing-2 pl-spacing-8 pr-spacing-8 w-full outline-none"
            autoFocus
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
      ) : null}
      {belowSearchNew}
      {headerFooterSlot}
    </div>
  )
}
