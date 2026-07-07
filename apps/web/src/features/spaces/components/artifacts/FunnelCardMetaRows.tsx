'use client'

import type { ReactNode } from 'react'
import type { Funnel } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'

const FUNNEL_TYPE_LABEL: Record<string, string> = {
  website: 'Website',
  'lead-magnet': 'Lead magnet',
  'call-booking': 'Call booking',
  webinar: 'Webinar',
  vsl: 'VSL',
  custom: 'Custom',
  sales: 'Sales',
  optin: 'Opt-in',
  thank_you: 'Thank you',
  upsell: 'Upsell',
  downsell: 'Downsell',
  blog: 'Blog',
  application: 'Application',
}

function titleCase(value: string): string {
  const s = String(value).trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function publishedHostname(url?: string | null): string {
  if (!url) return '—'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function FunnelCardMetaRows({ funnel, fieldIds }: { funnel: Funnel; fieldIds: string[] }) {
  if (fieldIds.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {fieldIds.map((id) => {
        let label: string | null = null
        let value: ReactNode = null

        switch (id) {
          case 'funnel_type':
            label = 'Type'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {FUNNEL_TYPE_LABEL[funnel.funnel_type] ?? titleCase(funnel.funnel_type)}
              </span>
            )
            break
          case 'status':
            label = 'Status'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {titleCase(funnel.status)}
              </span>
            )
            break
          case 'published_url':
            label = 'URL'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {publishedHostname(funnel.published_url)}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {funnel.created_at ? formatRelativeArtifactDate(funnel.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {funnel.updated_at ? formatRelativeArtifactDate(funnel.updated_at) : '—'}
              </span>
            )
            break
          default:
            return null
        }

        return (
          <div key={id} className="flex min-w-0 items-start justify-between gap-2 text-[10px]">
            <span className="shrink-0 text-[var(--color-muted-foreground)]">{label}</span>
            <div className="flex min-w-0 max-w-[65%] flex-1 justify-end">{value}</div>
          </div>
        )
      })}
    </div>
  )
}
