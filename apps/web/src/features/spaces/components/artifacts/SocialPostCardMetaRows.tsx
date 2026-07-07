'use client'

import type { ReactNode } from 'react'
import type { SocialPost } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'
import { socialPostPlatformIconSrc } from './SocialPostCardPreview'

const POST_TYPE_LABEL: Record<SocialPost['post_type'], string> = {
  single_image: 'Single image',
  carousel: 'Carousel',
  text_only: 'Text only',
  story: 'Story',
  reel: 'Reel',
}

function platformDisplayName(platform: SocialPost['platform']): string {
  if (platform === 'linkedin') return 'LinkedIn'
  return 'Instagram'
}

function statusDisplayLabel(status: SocialPost['status']): string {
  const s = String(status).trim()
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function SocialPostCardMetaRows({
  post,
  fieldIds,
}: {
  post: SocialPost
  fieldIds: string[]
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
              <span className="inline-flex max-w-full items-center justify-end gap-1">
                <img
                  src={socialPostPlatformIconSrc(post.platform)}
                  alt=""
                  className="h-2.5 w-2.5 shrink-0 rounded-sm object-contain"
                  width={10}
                  height={10}
                />
                <span className="truncate text-[10px] text-[var(--foreground)]">
                  {platformDisplayName(post.platform)}
                </span>
              </span>
            )
            break
          case 'post_type':
            label = 'Format'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {POST_TYPE_LABEL[post.post_type] ?? post.post_type}
              </span>
            )
            break
          case 'status':
            label = 'Status'
            value = (
              <span className="truncate text-[10px] text-[var(--foreground)]">
                {statusDisplayLabel(post.status)}
              </span>
            )
            break
          case 'created_at':
            label = 'Created'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {post.created_at ? formatRelativeArtifactDate(post.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {post.updated_at ? formatRelativeArtifactDate(post.updated_at) : '—'}
              </span>
            )
            break
          case 'scheduled_at':
            label = 'Scheduled'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {post.scheduled_at ? formatRelativeArtifactDate(post.scheduled_at) : '—'}
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
