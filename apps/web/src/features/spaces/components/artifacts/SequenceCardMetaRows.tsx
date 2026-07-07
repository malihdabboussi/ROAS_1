'use client'

import type { ReactNode } from 'react'
import type { Sequence } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'

function titleCase(value: string): string {
  const s = String(value).trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function triggerLabel(trigger: Record<string, unknown>): string {
  const t = trigger?.type
  if (typeof t === 'string' && t.trim()) {
    return titleCase(t.replace(/_/g, ' '))
  }
  return 'Manual'
}

export function SequenceCardMetaRows({
  sequence,
  fieldIds,
  funnelName,
}: {
  sequence: Sequence
  fieldIds: string[]
  funnelName?: string
}) {
  if (fieldIds.length === 0) return null

  const n = sequence.sequence_emails?.length ?? 0

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {fieldIds.map((id) => {
        let label: string | null = null
        let value: ReactNode = null

        switch (id) {
          case 'status':
            label = 'Status'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {titleCase(sequence.status)}
              </span>
            )
            break
          case 'funnel':
            if (!funnelName) return null
            label = 'Funnel'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">{funnelName}</span>
            )
            break
          case 'trigger':
            label = 'Trigger'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {triggerLabel(sequence.trigger ?? {})}
              </span>
            )
            break
          case 'email_count':
            label = 'Emails'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {n} {n === 1 ? 'email' : 'emails'}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {sequence.created_at ? formatRelativeArtifactDate(sequence.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {sequence.updated_at ? formatRelativeArtifactDate(sequence.updated_at) : '—'}
              </span>
            )
            break
          default:
            return null
        }

        return (
          <div
            key={id}
            className="flex min-w-0 items-start justify-between gap-2 text-[10px]"
          >
            <span className="shrink-0 text-[var(--color-muted-foreground)]">{label}</span>
            <div className="flex min-w-0 max-w-[65%] flex-1 justify-end">{value}</div>
          </div>
        )
      })}
    </div>
  )
}
