'use client'

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
  const badge = formatBadge(ad.format)
  const dateLabel = shownDateLabel(ad.last_shown ?? ad.first_shown)

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
      className="hover:border-[var(--color-muted-foreground)]/30 group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--color-secondary)] transition-all hover:shadow-lg"
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden bg-black/20',
          ad.platform === 'tiktok' ? 'aspect-[9/16]' : 'aspect-[9/8]',
        )}
      >
        {ad.image_url ? (
          <img
            src={ad.image_url}
            alt={ad.creative_text ?? ad.ad_id}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="gap-spacing-2 flex h-full w-full flex-col items-center justify-center px-3 text-center text-[var(--color-muted-foreground)]">
            {ad.creative_text ? (
              <p className="body-3 line-clamp-5">{ad.creative_text}</p>
            ) : ad.format === 'video' ? (
              <>
                {/* Google hides video media in search results — Analyze pulls it when available. */}
                <Play className="h-7 w-7 opacity-40" />
                {ad.advertiser_name ? (
                  <p className="body-3 line-clamp-2 font-medium text-[var(--foreground)]">
                    {ad.advertiser_name}
                  </p>
                ) : null}
                <p className="text-[10px] opacity-70">Video ad — open to analyze</p>
              </>
            ) : (
              <Megaphone className="h-8 w-8 opacity-30" />
            )}
          </div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {badge}
          </span>
        )}
        {dateLabel && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {dateLabel}
          </span>
        )}
        {ad.is_active != null && (
          <span
            className={cn(
              'absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
              ad.is_active ? 'bg-emerald-500/80 text-white' : 'bg-black/60 text-white/70',
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
              'absolute bottom-2 right-2 flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white transition-opacity',
              saved ? 'opacity-100' : 'opacity-0 hover:bg-black/80 group-hover:opacity-100',
            )}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>

      {ad.image_url && ad.creative_text ? (
        <p className="body-3 line-clamp-2 px-3 pt-2 text-[var(--foreground)]">{ad.creative_text}</p>
      ) : null}
      {ad.advertiser_name && (
        <p className="body-3 truncate px-3 pt-1 text-[var(--color-muted-foreground)]">
          {ad.advertiser_name}
        </p>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 py-2.5">
        {ad.days_running != null && (
          <span
            className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            title="Days running"
          >
            <Clock className="h-3 w-3" />
            {ad.days_running}d
          </span>
        )}
        {ad.reach_estimate && (
          <span
            className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            title="Estimated audience"
          >
            <Users className="h-3 w-3" />
            {ad.reach_estimate}
          </span>
        )}
        {ad.variant_count != null && ad.variant_count > 1 && (
          <span
            className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            title="Running copies of this creative. More copies usually means it converts"
          >
            <Layers className="h-3 w-3" />×{ad.variant_count}
          </span>
        )}
        {ad.days_running == null && !ad.reach_estimate && (
          <span className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            <Eye className="h-3 w-3" />
            Ad
          </span>
        )}
      </div>
    </div>
  )
}
