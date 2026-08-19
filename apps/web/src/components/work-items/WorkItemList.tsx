'use client'

import { cn } from '@/lib/utils/cn'

/**
 * The one shared list chrome for work items — meeting action items and
 * (eventually) space list rows all render inside this same bordered,
 * divided card so lists look identical everywhere.
 */
export function WorkItemList({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ul
      className={cn(
        'border-border bg-card divide-border rounded-spacing-2 divide-y overflow-hidden border',
        className,
      )}
    >
      {children}
    </ul>
  )
}

/**
 * Shared row: leading indicator · title + caption · trailing accessory.
 * Rendered as a `div[role=button]` (not `<button>`) so leading/trailing slots
 * can hold their own interactive controls without nesting buttons.
 */
export function WorkItemListRow({
  leading,
  title,
  struck = false,
  caption,
  trailing,
  trailingHoverReveal = false,
  onOpen,
  openLabel,
}: {
  leading?: React.ReactNode
  title: string
  /** Line-through + dimmed title (resolved / completed rows). */
  struck?: boolean
  /** Second line under the title. */
  caption?: React.ReactNode
  /** Right-aligned accessory (due date, move menu, …). */
  trailing?: React.ReactNode
  /** Show `trailing` only on row hover / focus-within (for action buttons). */
  trailingHoverReveal?: boolean
  onOpen?: () => void
  /** Accessible name for the row's open affordance; defaults to the title. */
  openLabel?: string
}) {
  const interactive = !!onOpen
  return (
    <li>
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? (openLabel ?? title) : undefined}
        onClick={interactive ? onOpen : undefined}
        onKeyDown={
          interactive
            ? (event) => {
                if (event.target !== event.currentTarget) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpen()
                }
              }
            : undefined
        }
        className={cn(
          'group/work-item-row flex w-full min-w-0 items-center gap-3 px-3.5 py-3 text-left',
          interactive && 'hover:bg-hover-subtle cursor-pointer transition-colors',
        )}
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'body-3 text-foreground block truncate font-medium',
              struck && 'line-through opacity-60',
            )}
            title={title}
          >
            {title}
          </span>
          {caption ? (
            <span className="typo-caption text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1">
              {caption}
            </span>
          ) : null}
        </span>
        {trailing ? (
          <span
            className={cn(
              'shrink-0',
              trailingHoverReveal &&
                'opacity-0 transition-opacity group-focus-within/work-item-row:opacity-100 group-hover/work-item-row:opacity-100',
            )}
          >
            {trailing}
          </span>
        ) : null}
      </div>
    </li>
  )
}
