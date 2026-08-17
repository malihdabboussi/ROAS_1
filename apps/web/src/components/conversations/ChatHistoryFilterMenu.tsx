'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { autoUpdate, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Check, ChevronDown, ListFilter, SquareArrowOutUpRight } from 'lucide-react'
import {
  chatHistoryActivityLabel,
  chatHistoryGroupByLabel,
  chatHistoryLeadingIconLabel,
  chatHistoryStatusLabel,
  chatHistoryTypeLabel,
  DEFAULT_CHAT_HISTORY_FILTERS,
  type ChatHistoryActivityFilter,
  type ChatHistoryFilterState,
  type ChatHistoryGroupBy,
  type ChatHistoryLeadingIcon,
  type ChatHistoryStatusFilter,
  type ChatHistoryTypeFilter,
} from '@/lib/conversations'
import { cn } from '@/lib/utils/cn'
import { ChatHistoryFilterScopeRow } from './ChatHistoryFilterScopeRow'

type SubmenuKey = 'agent' | 'type' | 'status' | 'lastActivity' | 'groupBy' | 'leadingIcon' | null

interface ChatHistoryFilterMenuProps {
  value: ChatHistoryFilterState
  onChange: (next: ChatHistoryFilterState) => void
  agentKey?: string | null
  agentOptions?: Array<{ key: string; label: string }>
  onAgentKeyChange?: (agentKey: string | null) => void
  onOpenAllChats?: () => void
  alwaysShowOpenAllChats?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const TYPE_OPTIONS: ChatHistoryTypeFilter[] = ['all', 'in_app', 'slack', 'telegram']
const STATUS_OPTIONS: ChatHistoryStatusFilter[] = ['active', 'archived', 'all']
const ACTIVITY_OPTIONS: ChatHistoryActivityFilter[] = ['1d', '3d', '7d', '30d', 'all']
const GROUP_BY_OPTIONS: ChatHistoryGroupBy[] = [
  'none',
  'date',
  'status',
  'campaign',
  'agent',
  'channel',
]
const LEADING_ICON_OPTIONS: ChatHistoryLeadingIcon[] = ['agent', 'logo', 'status', 'none']

export function ChatHistoryFilterMenu({
  value,
  onChange,
  agentKey,
  agentOptions,
  onAgentKeyChange,
  onOpenAllChats,
  alwaysShowOpenAllChats,
  onOpenChange,
  className,
}: ChatHistoryFilterMenuProps) {
  const [open, setOpen] = useState(false)
  const [submenu, setSubmenu] = useState<SubmenuKey>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const setMenuOpen = useCallback(
    (next: boolean) => {
      setOpen(next)
      onOpenChange?.(next)
      if (!next) setSubmenu(null)
    },
    [onOpenChange],
  )
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [offset(4), shift({ padding: 8, mainAxis: false })],
    whileElementsMounted: autoUpdate,
  })

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (
        rootRef.current?.contains(target as Node) ||
        refs.floating.current?.contains(target as Node) ||
        (target instanceof Element && target.closest('[data-conversation-scope-menu]'))
      ) {
        return
      }
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, refs.floating, setMenuOpen])

  const rowClass =
    'body-3 hover:bg-hover-subtle gap-spacing-3 flex w-full items-center justify-between rounded-spacing-2 px-spacing-3 py-spacing-2 text-left'

  const toggleSubmenu = (key: Exclude<SubmenuKey, null>) => {
    setSubmenu((prev) => (prev === key ? null : key))
  }

  const selectFilter = (next: ChatHistoryFilterState) => {
    onChange(next)
    setSubmenu(null)
  }

  return (
    <div ref={rootRef} className={cn('relative flex shrink-0 items-center gap-0.5', className)}>
      {onOpenAllChats ? (
        <button
          type="button"
          onClick={onOpenAllChats}
          className={cn(
            'btn-icon-bare hover:bg-hover-subtle shrink-0 transition-opacity',
            open || alwaysShowOpenAllChats
              ? 'opacity-100'
              : 'opacity-0 focus-visible:opacity-100 group-hover/chat-history-header:opacity-100',
          )}
          aria-label="Open all chats"
          title="All chats"
          tabIndex={open || alwaysShowOpenAllChats ? 0 : -1}
        >
          <SquareArrowOutUpRight className="icon-sm" aria-hidden />
        </button>
      ) : null}
      <button
        ref={refs.setReference}
        type="button"
        onClick={() => setMenuOpen(!open)}
        className={cn(
          'btn-icon-bare hover:bg-hover-subtle shrink-0',
          open && 'bg-hover-subtle text-foreground',
        )}
        aria-label="Filter conversations"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Filter"
      >
        <ListFilter className="icon-sm" aria-hidden />
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={refs.setFloating}
              id={menuId}
              role="menu"
              data-dropdown
              className="dropdown-menu-solid border-border z-dropdown fixed w-56 overflow-hidden rounded-xl border p-1 shadow-lg"
              style={floatingStyles}
            >
              {onAgentKeyChange ? (
                <>
                  <FilterRow
                    label="Agent"
                    value={
                      agentKey
                        ? (agentOptions?.find((option) => option.key === agentKey)?.label ??
                          agentKey)
                        : 'All'
                    }
                    expanded={submenu === 'agent'}
                    onToggle={() => toggleSubmenu('agent')}
                    className={rowClass}
                  />
                  {submenu === 'agent' ? (
                    <>
                      <SubmenuOption
                        label="All agents"
                        selected={agentKey == null}
                        onSelect={() => {
                          onAgentKeyChange(null)
                          setSubmenu(null)
                        }}
                      />
                      {agentOptions?.map((option) => (
                        <SubmenuOption
                          key={option.key}
                          label={option.label}
                          selected={agentKey === option.key}
                          onSelect={() => {
                            onAgentKeyChange(option.key)
                            setSubmenu(null)
                          }}
                        />
                      ))}
                    </>
                  ) : null}
                  <div className="border-border my-1 border-t" />
                </>
              ) : null}

              <ChatHistoryFilterScopeRow value={value} onChange={onChange} rowClass={rowClass} />

              <FilterRow
                label="Type"
                value={chatHistoryTypeLabel(value.type)}
                expanded={submenu === 'type'}
                onToggle={() => toggleSubmenu('type')}
                className={rowClass}
              />
              {submenu === 'type'
                ? TYPE_OPTIONS.map((option) => (
                    <SubmenuOption
                      key={option}
                      label={chatHistoryTypeLabel(option)}
                      selected={value.type === option}
                      onSelect={() => selectFilter({ ...value, type: option })}
                    />
                  ))
                : null}

              <FilterRow
                label="Status"
                value={chatHistoryStatusLabel(value.status)}
                expanded={submenu === 'status'}
                onToggle={() => toggleSubmenu('status')}
                className={rowClass}
              />
              {submenu === 'status'
                ? STATUS_OPTIONS.map((option) => (
                    <SubmenuOption
                      key={option}
                      label={chatHistoryStatusLabel(option)}
                      selected={value.status === option}
                      onSelect={() => selectFilter({ ...value, status: option })}
                    />
                  ))
                : null}

              <FilterRow
                label="Last activity"
                value={chatHistoryActivityLabel(value.lastActivity)}
                expanded={submenu === 'lastActivity'}
                onToggle={() => toggleSubmenu('lastActivity')}
                className={rowClass}
              />
              {submenu === 'lastActivity'
                ? ACTIVITY_OPTIONS.map((option) => (
                    <SubmenuOption
                      key={option}
                      label={chatHistoryActivityLabel(option)}
                      selected={value.lastActivity === option}
                      onSelect={() => selectFilter({ ...value, lastActivity: option })}
                    />
                  ))
                : null}

              <div className="border-border my-1 border-t" />

              <FilterRow
                label="Group by"
                value={chatHistoryGroupByLabel(value.groupBy)}
                expanded={submenu === 'groupBy'}
                onToggle={() => toggleSubmenu('groupBy')}
                className={rowClass}
              />
              {submenu === 'groupBy'
                ? GROUP_BY_OPTIONS.map((option) => (
                    <SubmenuOption
                      key={option}
                      label={chatHistoryGroupByLabel(option)}
                      selected={value.groupBy === option}
                      onSelect={() => selectFilter({ ...value, groupBy: option })}
                    />
                  ))
                : null}

              <FilterRow
                label="Icon"
                value={chatHistoryLeadingIconLabel(value.leadingIcon)}
                expanded={submenu === 'leadingIcon'}
                onToggle={() => toggleSubmenu('leadingIcon')}
                className={rowClass}
              />
              {submenu === 'leadingIcon'
                ? LEADING_ICON_OPTIONS.map((option) => (
                    <SubmenuOption
                      key={option}
                      label={chatHistoryLeadingIconLabel(option)}
                      selected={value.leadingIcon === option}
                      onSelect={() => selectFilter({ ...value, leadingIcon: option })}
                    />
                  ))
                : null}

              <div className="border-border my-1 border-t" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange({ ...DEFAULT_CHAT_HISTORY_FILTERS })
                  onAgentKeyChange?.(null)
                  setMenuOpen(false)
                }}
                className={rowClass}
              >
                <span className="text-foreground">Reset to defaults</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function FilterRow({
  label,
  value,
  expanded,
  onToggle,
  className,
}: {
  label: string
  value: string
  expanded: boolean
  onToggle: () => void
  className: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(className, expanded && 'bg-hover-subtle')}
    >
      <span className="text-foreground">{label}</span>
      <span className="text-muted-foreground gap-spacing-1 flex items-center">
        {value}
        <ChevronDown
          className={cn('icon-sm transition-transform', expanded && 'rotate-180')}
          aria-hidden
        />
      </span>
    </button>
  )
}

function SubmenuOption({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
      className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 py-spacing-2 pl-spacing-6 pr-spacing-3 flex w-full items-center justify-between text-left"
    >
      <span>{label}</span>
      {selected ? <Check className="icon-sm text-primary" aria-hidden /> : null}
    </button>
  )
}
