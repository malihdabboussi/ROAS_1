'use client'

import type { ReactNode } from 'react'
import type { Presentation } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'

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

export function PresentationCardMetaRows({
  presentation,
  fieldIds,
  offerName,
}: {
  presentation: Presentation
  fieldIds: string[]
  offerName?: string
}) {
  if (fieldIds.length === 0) return null

  const slideN = presentation.slides_count ?? presentation.slides?.length ?? 0

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
                {titleCase(presentation.status)}
              </span>
            )
            break
          case 'slide_count':
            label = 'Slides'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {slideN} {slideN === 1 ? 'slide' : 'slides'}
              </span>
            )
            break
          case 'published_url':
            label = 'URL'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {publishedHostname(presentation.published_url)}
              </span>
            )
            break
          case 'slug':
            label = 'Slug'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {presentation.slug?.trim() ? presentation.slug : '—'}
              </span>
            )
            break
          case 'offer':
            if (!presentation.offer_id) return null
            label = 'Offer'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {offerName?.trim() ? offerName : '—'}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {presentation.created_at
                  ? formatRelativeArtifactDate(presentation.created_at)
                  : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {presentation.updated_at
                  ? formatRelativeArtifactDate(presentation.updated_at)
                  : '—'}
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
