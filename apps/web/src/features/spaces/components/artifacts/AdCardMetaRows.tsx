'use client'

import type { ReactNode } from 'react'
import type { Ad, AdFormat } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'

const AD_FORMAT_LABEL: Record<AdFormat, string> = {
  SINGLE_IMAGE: 'Single image',
  SINGLE_VIDEO: 'Single video',
  CAROUSEL: 'Carousel',
}

function statusDisplayLabel(status: string | null | undefined): string {
  const s = String(status ?? '').trim()
  if (!s) return '—'
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function sourceLabel(source: string | null | undefined): string {
  const s = String(source ?? 'vibey').trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function AdCardMetaRows({
  ad,
  fieldIds,
  adSetName,
}: {
  ad: Ad
  fieldIds: string[]
  /** Resolved ad set name when `ad.ad_set_id` is set. */
  adSetName?: string | null
}) {
  if (fieldIds.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {fieldIds.map((id) => {
        let label: string | null = null
        let value: ReactNode = null

        switch (id) {
          case 'platform':
            label = 'Platform'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {ad.platform?.trim() ? ad.platform : '—'}
              </span>
            )
            break
          case 'placement':
            label = 'Placement'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {ad.placement?.trim() ? ad.placement : '—'}
              </span>
            )
            break
          case 'ad_format':
            label = 'Format'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {AD_FORMAT_LABEL[ad.ad_format] ?? ad.ad_format}
              </span>
            )
            break
          case 'status':
            label = 'Status'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {statusDisplayLabel(ad.meta_effective_status)}
              </span>
            )
            break
          case 'source':
            label = 'Source'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {sourceLabel(ad.source)}
              </span>
            )
            break
          case 'ad_set':
            label = 'Ad set'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {ad.ad_set_id
                  ? (adSetName?.trim() ? adSetName : ad.ad_set_id)
                  : '—'}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {ad.created_at ? formatRelativeArtifactDate(ad.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {ad.updated_at ? formatRelativeArtifactDate(ad.updated_at) : '—'}
              </span>
            )
            break
          case 'primary_text':
            label = 'Primary text'
            value = (
              <span className="line-clamp-2 text-right text-[10px] text-[var(--foreground)]">
                {ad.primary_text?.trim() ? ad.primary_text : '—'}
              </span>
            )
            break
          case 'destination_url':
            label = 'Destination'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {ad.destination_url?.trim() ? ad.destination_url : '—'}
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
