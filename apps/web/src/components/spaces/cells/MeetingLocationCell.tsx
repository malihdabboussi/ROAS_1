'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import {
  clientCampaignClientHref,
  clientCampaignSpaceHref,
  parseClientCampaignMapping,
} from '@/lib/agency-clients'
import { CLIENT_WORKSPACE_FIELD_ID, MAPPED_SPACE_FIELD_ID, type SpaceItem } from '@/lib/spaces'
import { cn } from '@/lib/utils/cn'
import { campaignNameFromMappingPath, useSpaceMappingIndex } from '@/lib/work-items'
import type { BaseCellProps } from './cell-types'

export function MeetingLocationCell({
  field,
  readonly,
  fieldRowVariant = 'default',
  spaceItem,
}: BaseCellProps & { spaceItem?: SpaceItem; fieldRowVariant?: 'default' | 'kanban' }) {
  const mapping = parseClientCampaignMapping(spaceItem?.custom_data?.client_campaign)
  const index = useSpaceMappingIndex(Boolean(mapping?.roas_space_id))
  const entry = mapping?.roas_space_id ? (index?.get(mapping.roas_space_id) ?? null) : null
  const isCampaignSpace = field.id === MAPPED_SPACE_FIELD_ID
  const label = isCampaignSpace
    ? entry?.spaceTitle?.trim() || ''
    : entry?.campaignName?.trim() ||
      campaignNameFromMappingPath(entry?.pathLabel) ||
      mapping?.campaign_name?.trim() ||
      ''
  const href = mapping
    ? isCampaignSpace
      ? clientCampaignSpaceHref(mapping)
      : clientCampaignClientHref(mapping)
    : null
  const showIcon = Boolean(label)

  return (
    <div
      data-cell
      className="flex min-w-0 items-center gap-1.5"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {showIcon ? (
        <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
      {label && href && !readonly ? (
        <Link
          href={href}
          className={cn(
            'typo-caption text-foreground hover:text-primary min-w-0 truncate',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          {label}
        </Link>
      ) : label ? (
        <span
          className={cn(
            'typo-caption text-foreground min-w-0 truncate',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          {label}
        </span>
      ) : (
        <span
          className={cn(
            'typo-caption text-muted-foreground',
            fieldRowVariant === 'kanban' && 'text-xs',
          )}
        >
          —
        </span>
      )}
    </div>
  )
}

export function isMeetingLocationField(fieldId: string, spaceItem?: SpaceItem): boolean {
  if (spaceItem?.custom_data?.entry_type !== 'call') return false
  return fieldId === CLIENT_WORKSPACE_FIELD_ID || fieldId === MAPPED_SPACE_FIELD_ID
}
