'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function HomeDashboardV4Menu({
  open,
  onClose,
  children,
  width = 300,
  align = 'left',
  className,
  /** When set, menu is portaled and positioned under this anchor (avoids overflow clipping). */
  anchorRef,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  align?: 'left' | 'right'
  className?: string
  anchorRef?: React.RefObject<HTMLElement | null>
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setCoords(null)
      return
    }
    const rect = anchorRef.current.getBoundingClientRect()
    const left =
      align === 'right' ? Math.max(8, rect.right - width) : Math.max(8, rect.left)
    setCoords({ top: rect.bottom + 8, left })
  }, [open, anchorRef, align, width])

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (anchorRef?.current?.contains(target)) return
      if (ref.current?.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open, onClose, anchorRef])

  if (!open) return null

  const menu = (
    <div
      ref={ref}
      className={cn(
        'hd4-menu',
        !anchorRef && (align === 'right' ? 'hd4-menu-right' : 'hd4-menu-left'),
        anchorRef && 'hd4-menu-portal',
        className,
      )}
      style={
        anchorRef && coords
          ? { width, top: coords.top, left: coords.left }
          : { width }
      }
    >
      {children}
    </div>
  )

  if (anchorRef && typeof document !== 'undefined') {
    return createPortal(menu, document.body)
  }

  return menu
}

export function HomeDashboardV4MenuLabel({ children }: { children: ReactNode }) {
  return <div className="hd4-menu-label">{children}</div>
}

export function HomeDashboardV4MenuItem({
  icon: Icon,
  label,
  sub,
  checked,
  right,
  chevron,
  onClick,
  className,
}: {
  icon?: LucideIcon
  label: ReactNode
  sub?: ReactNode
  checked?: boolean
  right?: ReactNode
  chevron?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('hd4-menu-item', sub ? 'hd4-menu-item-start' : undefined, className)}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--hd4-text-2)]" aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        <div className="hd4-menu-item-title">{label}</div>
        {sub ? <div className="hd4-menu-item-sub">{sub}</div> : null}
      </div>
      {right}
      {checked ? <Check className="h-3.5 w-3.5 shrink-0 text-[var(--hd4-primary)]" /> : null}
      {chevron ? (
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--hd4-text-3)]" aria-hidden />
      ) : null}
    </button>
  )
}

export function HomeDashboardV4MenuDivider() {
  return <div className="hd4-menu-divider" />
}

export function HomeDashboardV4Chip({
  label,
  value,
  icon: Icon,
  open,
  selected,
  onClick,
  innerRef,
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  open?: boolean
  selected?: boolean
  onClick?: () => void
  innerRef?: React.RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={innerRef}
      type="button"
      onClick={onClick}
      className={cn('hd4-chip', open && 'hd4-chip-open', selected && 'hd4-chip-selected')}
    >
      <span className="hd4-chip-label">
        {label} <ChevronDown className="h-2 w-2" aria-hidden />
      </span>
      <span className="hd4-chip-value">
        {Icon ? <Icon className="h-3 w-3 text-[var(--hd4-text-2)]" aria-hidden /> : null}
        {value}
      </span>
    </button>
  )
}
