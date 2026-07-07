'use client'

import { Eye, Star } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { favoriteFolderIdsOf, type FavoriteFolder } from '../../services/favorite-folders.service'
import { formatViewCount } from '../../services/social-research.service'
import type { SpaceItem } from '../../types'
import type { SocialPlatform } from '../../types/space-schema'
import { FavoriteFolderDropdown } from '../social-research/FavoriteFolderDropdown'
import { cachedSocialThumbnailUrl } from '../social-research/social-image-proxy'
import { OutlierChip } from './OutlierChip'
import { resolveSocialResearchMediaFrame } from './social-research-media-frame'
import { SocialResearchEnrichmentBadges } from '../social-research/SocialResearchEnrichmentBadges'

interface ContentCardProps {
  item: SpaceItem
  onClick: (item: SpaceItem) => void
  /** Defaults to 'instagram' so existing call sites keep working without churn. */
  platform?: SocialPlatform
  /** Favorite-folder support — the star dropdown renders only when provided. */
  favoriteFolders?: FavoriteFolder[]
  onToggleFavoriteFolder?: (item: SpaceItem, folder: FavoriteFolder) => void | Promise<void>
  onCreateFavoriteFolder?: (name: string) => Promise<FavoriteFolder | null>
}

const PLATFORM_DISPLAY_NAME: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
}

const PLATFORM_DRAG_TYPE: Record<SocialPlatform, string> = {
  instagram: 'instagram-research',
  tiktok: 'tiktok-research',
  youtube: 'youtube-research',
  twitter: 'twitter-research',
}

export function ContentCard({
  item,
  onClick,
  platform = 'instagram',
  favoriteFolders,
  onToggleFavoriteFolder,
  onCreateFavoriteFolder,
}: ContentCardProps) {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const favoriteIds = favoriteFolderIdsOf(cd)
  const thumbnailUrl = cachedSocialThumbnailUrl(platform, cd)
  const playCount = (cd.play_count as number) ?? 0
  const outlierScore = (cd.outlier_score as number) ?? 0
  const handle = cd._handle as string
  const mediaType = cd.media_type as string
  const takenAt = cd.taken_at as string | null
  const mediaFrame = resolveSocialResearchMediaFrame(mediaType, platform)

  const dateLabel = takenAt
    ? new Date(takenAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'copy'
        const fallback = PLATFORM_DISPLAY_NAME[platform]
        const h = typeof handle === 'string' && handle.trim() ? handle.trim() : fallback
        const label = `@${h} · ${formatViewCount(playCount)} views`.slice(0, 500)
        e.dataTransfer.setData(
          'application/x-vibey-artifact',
          JSON.stringify({
            id: item.id,
            type: PLATFORM_DRAG_TYPE[platform],
            label,
          }),
        )
      }}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(item)
        }
      }}
      className={cn(
        'hover:border-[var(--color-muted-foreground)]/30 group flex cursor-grab flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--color-secondary)] transition-all hover:shadow-lg active:cursor-grabbing',
      )}
    >
      <div
        className={cn(
          'relative w-full shrink-0 overflow-hidden bg-black/20',
          mediaFrame.aspectClass,
        )}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={item.title}
            className={cn(
              'h-full w-full transition-transform group-hover:scale-105',
              mediaFrame.imageObjectClass,
            )}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-muted-foreground)]">
            <Eye className="h-8 w-8 opacity-30" />
          </div>
        )}
        {mediaType === 'reel' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {platform === 'tiktok' ? 'VIDEO' : 'REEL'}
          </span>
        )}
        {mediaType === 'youtube_video' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            VIDEO
          </span>
        )}
        {mediaType === 'youtube_short' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            SHORT
          </span>
        )}
        {mediaType === 'tweet' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            TWEET
          </span>
        )}
        {mediaType === 'tweet_video' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            VIDEO
          </span>
        )}
        {mediaType === 'slideshow' && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            SLIDES
          </span>
        )}
        {dateLabel && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80">
            {dateLabel}
          </span>
        )}
        {favoriteFolders && onToggleFavoriteFolder && onCreateFavoriteFolder && (
          <div className="absolute bottom-2 right-2">
            <FavoriteFolderDropdown
              folders={favoriteFolders}
              selectedIds={favoriteIds}
              onToggleFolder={(folder) => onToggleFavoriteFolder(item, folder)}
              onCreateFolder={onCreateFavoriteFolder}
              trigger={({ open, toggle, favorited, triggerRef }) => (
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle()
                  }}
                  title={favorited ? 'In favorites' : 'Add to favorites'}
                  className={cn(
                    'flex items-center justify-center rounded-md bg-black/60 p-1.5 text-white transition-opacity',
                    favorited || open
                      ? 'opacity-100'
                      : 'opacity-0 hover:bg-black/80 group-hover:opacity-100',
                  )}
                >
                  <Star
                    className={cn('h-3.5 w-3.5', favorited && 'fill-amber-400 text-amber-400')}
                  />
                </button>
              )}
            />
          </div>
        )}
      </div>

      <div className="mt-auto flex shrink-0 items-center gap-1.5 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="badge-glass badge-glass-muted flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            <Eye className="h-3 w-3" />
            {formatViewCount(playCount)}
          </span>
          <OutlierChip score={outlierScore} />
          <span className="truncate rounded-full bg-[var(--color-hover-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-muted-foreground)]">
            @{handle}
          </span>
        </div>
        <SocialResearchEnrichmentBadges customData={cd} />
      </div>
    </div>
  )
}
