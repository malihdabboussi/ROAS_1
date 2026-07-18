'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

export interface FilterOption {
  id: string
  label: string
  description?: string
  /** Multi-select: row with no agents (still visible at bottom). */
  disabled?: boolean
  /** Strategy / tier color on the label (`text-chip-strategy-*`). */
  labelClassName?: string
  /** Composer-style glass chip on the label (`chip-glass-*`). */
  chipClassName?: string
  /** When > 0, shown on the right; omit for zero-count rows. */
  trailingCount?: number
}

interface Team2FilterDropdownProps {
  label: string
  options: FilterOption[]
  /** When provided, multi-select; selected IDs. */
  selectedIds?: string[]
  onToggle?: (id: string) => void
  /** When provided, single-select; current ID. */
  currentId?: string | null
  onSelect?: (id: string) => void
  disabled?: boolean
  align?: 'left' | 'right'
  /** Optional inline node rendered above the options (e.g. clear button). */
  headerSlot?: React.ReactNode
  /** Extra classes on the menu panel (e.g. min-width). */
  menuClassName?: string
  /** When true, options with `disabled: true` stay hidden until "Show all" is used (multi-select). */
  collapseDisabledOptions?: boolean
  showAllDisabledLabel?: string
  showLessDisabledLabel?: string
  /** When true, `description` shows as a right-side hover card instead of text below the label. */
  showDescriptionAsTooltip?: boolean
  /** Chip label trigger (default) or compact icon trigger. */
  trigger?: 'chip' | 'icon'
  /** Icon for `trigger="icon"` mode. */
  icon?: React.ReactNode
}

const MENU_MIN_WIDTH = 192
const MENU_VIEWPORT_PAD = 8

/** HubTool-style filter dropdown — portaled solid menu (design guidelines §11). */
export function Team2FilterDropdown({
  label,
  options,
  selectedIds,
  onToggle,
  currentId,
  onSelect,
  disabled = false,
  align = 'left',
  headerSlot,
  menuClassName,
  collapseDisabledOptions = false,
  showAllDisabledLabel = 'Show all',
  showLessDisabledLabel = 'Show less',
  showDescriptionAsTooltip = false,
  trigger = 'chip',
  icon,
}: Team2FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [unusedExpanded, setUnusedExpanded] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { primaryOptions, secondaryOptions } = useMemo(() => {
    if (!collapseDisabledOptions || onSelect) {
      return { primaryOptions: options, secondaryOptions: [] as FilterOption[] }
    }
    const primary: FilterOption[] = []
    const secondary: FilterOption[] = []
    for (const o of options) {
      if (o.disabled === true) secondary.push(o)
      else primary.push(o)
    }
    return { primaryOptions: primary, secondaryOptions: secondary }
  }, [options, collapseDisabledOptions, onSelect])

  useEffect(() => {
    if (!open) setUnusedExpanded(false)
  }, [open])

  const reposition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuWidth = Math.max(MENU_MIN_WIDTH, menuRef.current?.offsetWidth ?? MENU_MIN_WIDTH)
    const menuHeight = menuRef.current?.offsetHeight ?? 240
    let left = align === 'right' ? rect.right - menuWidth : rect.left
    left = Math.min(
      Math.max(MENU_VIEWPORT_PAD, left),
      window.innerWidth - menuWidth - MENU_VIEWPORT_PAD,
    )
    let top = rect.bottom + 4
    if (top + menuHeight > window.innerHeight - MENU_VIEWPORT_PAD) {
      top = Math.max(MENU_VIEWPORT_PAD, rect.top - menuHeight - 4)
    }
    setMenuPos({ top, left, width: menuWidth })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null)
      return
    }
    reposition()
  }, [open, align, options.length, unusedExpanded])

  useEffect(() => {
    if (!open) return
    const onReposition = () => reposition()
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
    return () => {
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (rootRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedCount = selectedIds?.length ?? 0
  const activeLabel =
    onSelect && currentId ? (options.find((o) => o.id === currentId)?.label ?? null) : null

  const showUnusedToggle = collapseDisabledOptions && !onSelect && secondaryOptions.length > 0

  const isActive = open || selectedCount > 0 || Boolean(activeLabel)

  const tooltipText = activeLabel
    ? `${label}: ${activeLabel}`
    : selectedCount > 0
      ? `${label} · ${selectedCount}`
      : label

  const iconTriggerClass = `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
    isActive
      ? 'bg-hover-subtle text-foreground'
      : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
  }`

  function renderOptionRow(option: FilterOption) {
    const isSelected = onSelect ? currentId === option.id : (selectedIds ?? []).includes(option.id)
    const blocked = option.disabled === true && !isSelected
    const count = option.trailingCount
    const hasDescription = Boolean(option.description)
    const descriptionBelow = hasDescription && !showDescriptionAsTooltip
    const showCount = !isSelected && typeof count === 'number' && count > 0
    const row = (
      <button
        type="button"
        role="menuitem"
        disabled={onSelect ? false : blocked}
        className={`gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 flex w-full items-center text-left transition-colors ${
          blocked
            ? 'text-muted-foreground cursor-not-allowed opacity-50'
            : `hover:bg-hover-subtle hover:text-foreground ${
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              }`
        }`}
        aria-checked={isSelected}
        onClick={() => {
          if (onSelect) {
            onSelect(option.id)
            setOpen(false)
          } else if (onToggle && !blocked) {
            onToggle(option.id)
          }
        }}
      >
        <span className="min-w-0 flex-1">
          {option.chipClassName ? (
            <span
              className={`${option.chipClassName} typo-caption inline-flex items-center rounded-full px-2 py-0.5 font-medium`}
            >
              {option.label}
            </span>
          ) : (
            <span
              className={`body-3 block font-medium ${
                option.labelClassName ?? (isSelected ? 'text-foreground' : 'text-muted-foreground')
              }`}
            >
              {option.label}
            </span>
          )}
          {descriptionBelow ? (
            <span className="body-4 text-muted-foreground mt-0.5 block">{option.description}</span>
          ) : null}
        </span>
        <span className="inline-flex shrink-0 justify-end tabular-nums">
          {isSelected ? (
            <Check className="icon-sm text-primary" aria-hidden />
          ) : showCount ? (
            <span className="body-4 text-muted-foreground">{count}</span>
          ) : null}
        </span>
      </button>
    )

    if (hasDescription && showDescriptionAsTooltip) {
      return (
        <Tooltip
          key={option.id}
          label={option.description!}
          side="right"
          wide
          delayMs={120}
          triggerClassName="block w-full"
        >
          {row}
        </Tooltip>
      )
    }

    return (
      <div key={option.id} className="w-full">
        {row}
      </div>
    )
  }

  const menu =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            data-dropdown
            className={cn(
              'dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-2 text-foreground fixed min-w-48',
              menuClassName,
            )}
            style={
              menuPos
                ? { top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }
                : { visibility: 'hidden', top: 0, left: 0 }
            }
            role="menu"
          >
            {headerSlot ? <div className="mb-spacing-2">{headerSlot}</div> : null}
            <div className="space-y-spacing-1">
              {primaryOptions.map(renderOptionRow)}
              {showUnusedToggle && !unusedExpanded ? (
                <button
                  type="button"
                  className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 w-full text-left transition-colors"
                  onClick={() => setUnusedExpanded(true)}
                >
                  {showAllDisabledLabel}
                </button>
              ) : null}
              {showUnusedToggle && unusedExpanded ? secondaryOptions.map(renderOptionRow) : null}
              {showUnusedToggle && unusedExpanded ? (
                <button
                  type="button"
                  className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-1 px-spacing-2 py-spacing-1 w-full text-left transition-colors"
                  onClick={() => setUnusedExpanded(false)}
                >
                  {showLessDisabledLabel}
                </button>
              ) : null}
              {options.length === 0 ? (
                <div className="body-4 text-muted-foreground px-spacing-2 py-spacing-1">
                  No options
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative" ref={rootRef}>
      <div
        ref={(el) => {
          triggerRef.current = el
        }}
      >
        {trigger === 'icon' ? (
          <Tooltip label={tooltipText} side="bottom" triggerClassName="flex h-full items-center">
            <span className="inline-flex">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={tooltipText}
                className={`${iconTriggerClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {icon}
              </button>
            </span>
          </Tooltip>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={open}
            className={`body-4 inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? 'bg-hover-subtle text-foreground'
                : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
            }`}
          >
            <span className="whitespace-nowrap">
              {activeLabel ? `${label}: ${activeLabel}` : label}
              {selectedCount > 0 ? ` · ${selectedCount}` : ''}
            </span>
            <ChevronDown className="icon-sm" />
          </button>
        )}
      </div>
      {menu}
    </div>
  )
}
