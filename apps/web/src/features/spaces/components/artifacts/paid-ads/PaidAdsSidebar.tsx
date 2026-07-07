'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RxDoubleArrowLeft, RxDoubleArrowRight } from 'react-icons/rx'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** Matches channels rail (`w-spacing-60`). */
const RAIL_EXPANDED_PX = 240
const RAIL_COLLAPSED_PX = 48

const railWidthTransition = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.4, 0, 0.2, 1] as const,
}

const innerPresenceTransition = {
  duration: 0.18,
  ease: [0.4, 0, 0.2, 1] as const,
}

export const PAID_ADS_GROUP_HEADER_CLS =
  'px-spacing-2 pb-1 pt-1 text-[10px] font-medium tracking-wider text-muted-foreground'

export const PAID_ADS_SIDEBAR_ACTION_BTN_CLS =
  'body-3 text-muted-foreground hover:text-foreground border-border flex w-full items-center gap-1.5 rounded-spacing-2 border px-spacing-2 py-spacing-1 transition-colors hover:bg-muted'

export function PaidAdsSplitLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode
  children: ReactNode
}) {
  return (
    <div className="gap-spacing-2 px-spacing-4 pt-spacing-1-5 pb-spacing-3 flex min-h-0 flex-1 overflow-hidden">
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  )
}

export function PaidAdsSidebar({
  title,
  ariaLabel,
  expandedContent,
  collapsedContent,
}: {
  title: string
  ariaLabel?: string
  expandedContent: ReactNode
  collapsedContent: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? RAIL_COLLAPSED_PX : RAIL_EXPANDED_PX }}
      transition={railWidthTransition}
      className="border-border bg-background rounded-spacing-4 flex min-h-0 shrink-0 flex-col overflow-hidden border"
      style={{ minWidth: 0 }}
      aria-label={ariaLabel ?? title}
    >
      <div className="relative flex min-h-0 min-w-0 flex-1">
        <AnimatePresence mode="sync" initial={false}>
          {collapsed ? (
            <motion.div
              key="collapsed"
              className="gap-spacing-2 py-spacing-3 absolute inset-0 flex min-h-0 min-w-0 flex-col items-center overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={innerPresenceTransition}
            >
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                aria-label={`Expand ${title} sidebar`}
                title={`Expand ${title} sidebar`}
              >
                <RxDoubleArrowRight className="icon-sm" aria-hidden />
              </button>
              <div className="gap-spacing-1 px-spacing-1 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
                {collapsedContent}
              </div>
              <div className="mt-auto flex shrink-0 items-center justify-center">
                <span
                  className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {title}
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={innerPresenceTransition}
            >
              <div className="border-border bg-muted group/paid-ads-header gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
                <p
                  className={cn(
                    'body-3 text-foreground min-w-0 flex-1 truncate font-semibold transition-transform duration-500 ease-in-out',
                    'group-hover/paid-ads-header:translate-x-1',
                  )}
                >
                  {title}
                </p>
                <div
                  className={cn(
                    'flex shrink-0 items-center transition-[opacity,transform] duration-200 ease-out',
                    'pointer-events-none translate-x-2 opacity-0',
                    'group-hover/paid-ads-header:pointer-events-auto group-hover/paid-ads-header:translate-x-0 group-hover/paid-ads-header:opacity-100',
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    className="text-muted-foreground hover:text-foreground h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors"
                    aria-label={`Collapse ${title} sidebar`}
                    title={`Collapse ${title} sidebar`}
                  >
                    <RxDoubleArrowLeft className="icon-sm" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="p-spacing-2 min-h-0 flex-1 overflow-y-auto">{expandedContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}

export function PaidAdsSidebarRow({
  label,
  subtitle,
  selected,
  onClick,
  icon,
  trailing,
}: {
  label: string
  subtitle?: string | null
  selected: boolean
  onClick: () => void
  icon?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div
      className={cn(
        'px-spacing-2 py-spacing-1 flex items-center gap-1 rounded-lg transition-colors',
        selected
          ? 'bg-[var(--color-primary)]/10 text-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="body-3 flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{label}</span>
          {subtitle ? (
            <span className="typo-caption text-muted-foreground block truncate">{subtitle}</span>
          ) : null}
        </span>
      </button>
      {trailing}
    </div>
  )
}

const TREE_ROW_CLS =
  'px-spacing-2 py-spacing-1 group/paid-ads-tree-row flex items-center gap-1 rounded-lg transition-colors'

const TREE_ROW_SELECTED_CLS = 'bg-[var(--color-primary)]/10 text-foreground'
const TREE_ROW_IDLE_CLS = 'text-muted-foreground hover:bg-muted hover:text-foreground'

/**
 * Row with optional count + 3-dot menu trigger on the right.
 * - Expandable rows swap left icon ↔ chevron on hover.
 * - When `trailing` is provided, hover (or `forceTrailing`) swaps the count for the trailing button.
 * - When `renaming` is true, label is replaced with an inline input.
 */
export function PaidAdsSidebarTreeRow({
  label,
  selected,
  onClick,
  onContextMenu,
  icon,
  count,
  expanded,
  onToggleExpand,
  expandable = false,
  trailing,
  forceTrailing = false,
  renaming = false,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  label: string
  selected: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  icon?: ReactNode
  count?: number
  expanded?: boolean
  onToggleExpand?: () => void
  expandable?: boolean
  trailing?: ReactNode
  forceTrailing?: boolean
  renaming?: boolean
  renameValue?: string
  onRenameChange?: (value: string) => void
  onRenameSubmit?: () => void
  onRenameCancel?: () => void
}) {
  const showExpandOnHover = expandable && !!onToggleExpand && !renaming
  const hasTrailing = !!trailing && !renaming
  const hasCount = count !== undefined && !renaming
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!renaming) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [renaming])

  return (
    <div
      className={cn(TREE_ROW_CLS, selected ? TREE_ROW_SELECTED_CLS : TREE_ROW_IDLE_CLS)}
      onContextMenu={onContextMenu}
    >
      <div className="relative h-4 w-4 shrink-0">
        {icon ? (
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
              showExpandOnHover &&
                'group-hover/paid-ads-tree-row:pointer-events-none group-hover/paid-ads-tree-row:opacity-0',
            )}
          >
            {icon}
          </span>
        ) : null}
        {showExpandOnHover ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground absolute inset-0 flex items-center justify-center rounded-md transition-opacity duration-150',
              'pointer-events-none opacity-0',
              'group-hover/paid-ads-tree-row:pointer-events-auto group-hover/paid-ads-tree-row:opacity-100',
            )}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>
      {renaming ? (
        <input
          ref={inputRef}
          value={renameValue ?? ''}
          onChange={(e) => onRenameChange?.(e.target.value)}
          onBlur={() => onRenameSubmit?.()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onRenameSubmit?.()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onRenameCancel?.()
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-primary)] bg-[var(--background)] px-1.5 py-0.5 text-[var(--foreground)] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="body-3 min-w-0 flex-1 truncate text-left font-medium"
        >
          {label}
        </button>
      )}
      {hasCount || hasTrailing ? (
        <div className="relative flex h-5 min-w-[1rem] shrink-0 items-center justify-end">
          {hasCount ? (
            <span
              className={cn(
                'typo-caption text-muted-foreground shrink-0 tabular-nums transition-opacity duration-150',
                hasTrailing &&
                  (forceTrailing ? 'opacity-0' : 'group-hover/paid-ads-tree-row:opacity-0'),
              )}
            >
              {count}
            </span>
          ) : null}
          {hasTrailing ? (
            <span
              className={cn(
                'absolute right-0 top-0 flex h-full items-center transition-opacity duration-150',
                forceTrailing
                  ? 'opacity-100'
                  : 'pointer-events-none opacity-0 group-hover/paid-ads-tree-row:pointer-events-auto group-hover/paid-ads-tree-row:opacity-100',
              )}
            >
              {trailing}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function PaidAdsSidebarIconButton({
  label,
  selected,
  onClick,
  children,
}: {
  label: string
  selected: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-spacing-8 w-spacing-8 rounded-spacing-2 flex shrink-0 items-center justify-center transition-colors',
        selected
          ? 'nav-glass-selected-purple text-foreground'
          : 'text-muted-foreground hover:bg-hover-subtle',
      )}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}
