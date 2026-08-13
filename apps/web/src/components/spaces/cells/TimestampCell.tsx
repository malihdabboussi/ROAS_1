'use client'

import { Clock, RefreshCw } from 'lucide-react'
import type { BaseCellProps } from './cell-types'

function formatRelative(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const diffMs = now - then
  const absDiff = Math.abs(diffMs)
  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function TimestampCell({
  field,
  value,
  fieldRowVariant = 'default',
  openOnMount: _openOnMount,
}: BaseCellProps & { fieldRowVariant?: 'default' | 'kanban' }) {
  const iso = typeof value === 'string' ? value : null
  const isKanban = fieldRowVariant === 'kanban'
  const Icon = field.type === 'updated_at' ? RefreshCw : Clock

  if (!iso) {
    return <span className="text-xs text-[var(--color-muted-foreground)]">-</span>
  }

  const display = isKanban ? formatRelative(iso) : formatShort(iso)
  const tooltip = new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <span
      className="flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]"
      title={tooltip}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {display}
    </span>
  )
}
