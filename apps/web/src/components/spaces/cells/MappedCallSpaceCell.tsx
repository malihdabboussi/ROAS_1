'use client'

import Link from 'next/link'
import { clientCampaignSpaceHref, parseClientCampaignMapping } from '@/lib/agency-clients'
import type { SpaceItem } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import { useSpaceMappingIndex } from '@/lib/work-items'
import type { BaseCellProps } from './cell-types'

export function MappedCallSpaceCell({
  readonly,
  fieldRowVariant = 'default',
  spaceItem,
}: BaseCellProps & { spaceItem?: SpaceItem; fieldRowVariant?: 'default' | 'kanban' }) {
  const mapping = parseClientCampaignMapping(spaceItem?.custom_data?.client_campaign)
  const index = useSpaceMappingIndex(Boolean(mapping?.roas_space_id))
  const spaceId = mapping?.roas_space_id?.trim() || null
  const title = spaceId ? index?.get(spaceId)?.spaceTitle?.trim() || null : null
  const href = mapping ? clientCampaignSpaceHref(mapping) : null
  const label = title || (href ? 'Open space' : null)

  return (
    <div
      data-cell
      className="flex min-w-0 items-center"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {label && href ? (
        <Link
          href={href}
          className={cn(
            'typo-caption text-foreground hover:text-primary min-w-0 truncate',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          {label}
        </Link>
      ) : (
        <span
          className={cn(
            'typo-caption text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
            readonly && 'min-w-0 truncate',
          )}
        >
          —
        </span>
      )}
    </div>
  )
}
