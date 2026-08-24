'use client'

import { CLIENT_CAMPAIGN_FIELD_ID } from '@/lib/agency-clients'
import type { SpaceItem } from '@/lib/spaces'
import { CLIENT_WORKSPACE_FIELD_ID, MAPPED_SPACE_FIELD_ID } from '@/lib/spaces'
import type { ExtendedCellProps } from './cell-types'
import { ClientCampaignCell } from './ClientCampaignCell'
import { HostCell } from './HostCell'
import { SourceCallCell } from './SourceCallCell'

export function isInterceptedSpaceFieldId(fieldId: string, spaceItem?: SpaceItem): boolean {
  if (fieldId === 'source_call' || fieldId === CLIENT_CAMPAIGN_FIELD_ID || fieldId === 'host') {
    return true
  }
  return isMeetingLocationField(fieldId, spaceItem)
}

function isMeetingLocationField(fieldId: string, spaceItem?: SpaceItem): boolean {
  if (spaceItem?.custom_data?.entry_type !== 'call') return false
  return fieldId === CLIENT_WORKSPACE_FIELD_ID || fieldId === MAPPED_SPACE_FIELD_ID
}

export function SpaceFieldIdCell(props: ExtendedCellProps) {
  const {
    field,
    value,
    onChange,
    readonly,
    spaceItem,
    fieldRowVariant,
    onOpenDetail,
    roster,
    currentUserId,
    onItemPatch,
  } = props
  if (field.id === 'source_call') {
    return (
      <SourceCallCell
        field={field}
        value={value}
        onChange={onChange}
        readonly={readonly}
        spaceItem={spaceItem}
        fieldRowVariant={fieldRowVariant}
        onOpenDetail={onOpenDetail}
      />
    )
  }
  if (field.id === CLIENT_CAMPAIGN_FIELD_ID) {
    return (
      <ClientCampaignCell
        field={field}
        value={value}
        onChange={onChange}
        readonly={readonly}
        fieldRowVariant={fieldRowVariant}
        openOnMount={props.openOnMount}
        spaceItem={spaceItem}
        onOpenDetail={onOpenDetail}
      />
    )
  }
  if (field.id === 'host') {
    return (
      <HostCell
        field={field}
        value={value}
        onChange={onChange}
        readonly={readonly}
        spaceItem={spaceItem}
        roster={roster}
        currentUserId={currentUserId}
        fieldRowVariant={fieldRowVariant}
      />
    )
  }
  if (isMeetingLocationField(field.id, spaceItem)) {
    return (
      <ClientCampaignCell
        field={field}
        value={spaceItem?.custom_data?.client_campaign}
        onChange={(next) => {
          if (!spaceItem || !onItemPatch) {
            onChange(next)
            return
          }
          onItemPatch({
            custom_data: {
              ...spaceItem.custom_data,
              client_campaign: next,
              client_campaign_source: next ? 'manual' : 'manual_cleared',
            },
          })
        }}
        readonly={readonly}
        fieldRowVariant={fieldRowVariant}
        spaceItem={spaceItem}
        displayMode={field.id === CLIENT_WORKSPACE_FIELD_ID ? 'client' : 'space'}
      />
    )
  }
  return null
}
