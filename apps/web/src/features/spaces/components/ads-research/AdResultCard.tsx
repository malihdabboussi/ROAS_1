'use client'

import { useState } from 'react'
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Eye,
  Layers,
  Loader2,
  Megaphone,
  Play,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { AdSearchResultItem } from '../../services/ads-research.service'

function formatBadge(format: AdSearchResultItem['format']): string | null {
  if (format === 'video') return 'VIDEO'
  if (format === 'image') return 'IMAGE'
  if (format === 'carousel') return 'CAROUSEL'
  if (format === 'text') return 'TEXT'
  return null
}

function shownDateLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function adResultExternalLink(ad: AdSearchResultItem): string | null {
  return ad.details_link ?? ad.landing_url ?? ad.video_url ?? ad.image_url
}

export function AdResultCard({
  ad,
  saved,
  saving,
  onSave,
  onClick,
}: {
  ad: AdSearchResultItem
  saved: boolean
  saving: boolean
  /** Hidden when undefined (e.g. the Saved ads grid). */
  onSave?: () => void
  onClick: () => void
}) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const badge = formatBadge(ad.format)
  const dateLabel = shownDateLabel(ad.last_shown ?? ad.first_shown)
  const hasImagePreview = Boolean(ad.image_url && failedImageUrl !== ad.image_url)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="border-border bg-secondary hover:bg-hover-subtle rounded-spacing-3 group flex cursor-pointer flex-col overflow-hidden border transition-all hover:shadow-lg"
    >
      <div
        className={cn(
          'bg-secondary relative w-full shrink-0 overflow-hidden',
          hasImagePreview
            ? ad.platform === 'tiktok'
              ? 'aspect-[9/16]'
              : 'aspect-[9/8]'
            : 'aspect-square',
        )}
      >
        {hasImagePreview ? (
          <img
            src={ad.image_url ?? undefined}
            alt="Ad creative preview"
            className="h-full w-full object-contain"
            loading="lazy"
            draggable={false}
            onError={() => setFailedImageUrl(ad.image_url)}
          />
        ) : (
          <div className="gap-spacing-2 px-spacing-3 text-muted-foreground flex h-full w-full flex-col items-center justify-center text-center">
            {ad.creative_text ? (
              <p className="body-3 line-clamp-5">{ad.creative_text}</p>
            ) : (
              <>
                {ad.format === 'video' ? (
                  <Play className="icon-lg opacity-40" />
                ) : (
                  <Megaphone className="icon-lg opacity-30" />
                )}
                {ad.advertiser_name ? (
                  <p className="body-3 text-foreground line-clamp-2 font-medium">
                    {ad.advertiser_name}
                  </p>
                ) : null}
                <p className="body-4 font-medium">Preview unavailable</p>
                <p className="typo-caption opacity-70">Open the original ad</p>
              </>
            )}
          </div>
        )}
        {badge && (
          <span className="bg-modal-overlay text-foreground typo-section-label left-spacing-2 top-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 absolute font-medium">
            {badge}
          </span>
        )}
        {dateLabel && (
          <span className="bg-modal-overlay text-muted-foreground typo-caption right-spacing-2 top-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 absolute">
            {dateLabel}
          </span>
        )}
        {ad.is_active != null && (
          <span
            className={cn(
              'typo-section-label bottom-spacing-2 left-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 absolute font-medium',
              ad.is_active
                ? 'bg-success/80 text-foreground'
                : 'bg-modal-overlay text-muted-foreground',
            )}
          >
            {ad.is_active ? 'ACTIVE' : 'INACTIVE'}
          </span>
        )}
        {onSave ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (!saved && !saving) onSave()
            }}
            title={saved ? 'Saved to space' : 'Save ad to space'}
            className={cn(
              'bg-modal-overlay text-foreground bottom-spacing-2 right-spacing-2 p-spacing-2 rounded-spacing-1 absolute flex items-center justify-center transition-opacity',
              saved ? 'opacity-100' : 'hover:bg-secondary opacity-0 group-hover:opacity-100',
            )}
          >
            {saving ? (
              <Loader2 className="icon-sm animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="icon-sm text-success" />
            ) : (
              <Bookmark className="icon-sm" />
            )}
          </button>
        ) : null}
      </div>

      {ad.image_url && ad.creative_text ? (
        <p className="body-3 text-foreground px-spacing-3 pt-spacing-2 line-clamp-2">
          {ad.creative_text}
        </p>
      ) : null}
      {ad.advertiser_name && (hasImagePreview || ad.creative_text) ? (
        <p className="body-3 text-muted-foreground px-spacing-3 pt-spacing-1 truncate">
          {ad.advertiser_name}
        </p>
      ) : null}

      <div className="gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 flex-wrap items-center">
        {ad.days_running != null && (
          <span
            className="badge-glass badge-glass-muted body-4 gap-spacing-1 px-spacing-2 py-spacing-1 flex items-center rounded-full font-medium"
            title="Days running"
          >
            <Clock className="icon-xs" />
            {ad.days_running}d
          </span>
        )}
        {ad.reach_estimate && (
          <span
            className="badge-glass badge-glass-muted body-4 gap-spacing-1 px-spacing-2 py-spacing-1 flex items-center rounded-full font-medium"
            title="Estimated audience"
          >
            <Users className="icon-xs" />
            {ad.reach_estimate}
          </span>
        )}
        {ad.variant_count != null && ad.variant_count > 1 && (
          <span
            className="badge-glass badge-glass-muted body-4 gap-spacing-1 px-spacing-2 py-spacing-1 flex items-center rounded-full font-medium"
            title="Running copies of this creative. More copies usually means it converts"
          >
            <Layers className="icon-xs" />×{ad.variant_count}
          </span>
        )}
        {ad.days_running == null && !ad.reach_estimate && (
          <span className="badge-glass badge-glass-muted body-4 gap-spacing-1 px-spacing-2 py-spacing-1 flex items-center rounded-full font-medium">
            <Eye className="icon-xs" />
            Ad
          </span>
        )}
      </div>
    </div>
  )
}
