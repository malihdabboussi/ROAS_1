'use client'

import type { ReactNode } from 'react'
import type { Avatar } from '@/lib/artifacts/artifact-types'
import { formatRelativeArtifactDate } from './artifact-display'

export function AvatarCardMetaRows({
  avatar,
  fieldIds,
  offerName,
}: {
  avatar: Avatar
  fieldIds: string[]
  offerName?: string
}) {
  if (fieldIds.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {fieldIds.map((id) => {
        let label: string | null = null
        let value: ReactNode = null

        switch (id) {
          case 'offer':
            if (!avatar.offer_id) return null
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
                {avatar.created_at ? formatRelativeArtifactDate(avatar.created_at) : '—'}
              </span>
            )
            break
          case 'updated_at':
            label = 'Updated'
            value = (
              <span className="truncate text-right text-[10px] text-[var(--foreground)]">
                {avatar.updated_at ? formatRelativeArtifactDate(avatar.updated_at) : '—'}
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
