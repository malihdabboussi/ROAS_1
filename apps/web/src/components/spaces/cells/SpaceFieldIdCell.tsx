'use client'

import { CLIENT_CAMPAIGN_FIELD_ID } from '@/lib/agency-clients'
import { MAPPED_SPACE_FIELD_ID, type SpaceItem } from '@/lib/spaces'
import type { ExtendedCellProps } from './cell-types'
import { ClientCampaignCell } from './ClientCampaignCell'
import { HostCell } from './HostCell'
import { MappedCallSpaceCell } from './MappedCallSpaceCell'
import { SourceCallCell } from './SourceCallCell'

export function isInterceptedSpaceFieldId(fieldId: string, spaceItem?: SpaceItem): boolean {
  if (fieldId === 'source_call' || fieldId === CLIENT_CAMPAIGN_FIELD_ID || fieldId === 'host') {
    return true
  }
  return fieldId === MAPPED_SPACE_FIELD_ID && spaceItem?.custom_data?.entry_type === 'call'
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
  if (field.id === MAPPED_SPACE_FIELD_ID) {
    return (
      <MappedCallSpaceCell
        field={field}
        value={value}
        onChange={onChange}
        readonly={readonly}
        fieldRowVariant={fieldRowVariant}
        spaceItem={spaceItem}
      />
    )
  }
  return null
}
