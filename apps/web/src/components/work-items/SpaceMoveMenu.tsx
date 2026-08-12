'use client'

import { FolderInput } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { SpaceMappingPopover } from './SpaceMappingPopover'

/**
 * Icon-button flavor of the mapping cascade: a hover-revealed folder button
 * that relocates the item via SpaceMappingPopover.
 */
export function SpaceMoveMenu({
  sourceSpaceId,
  itemId,
  itemTitle,
  onMoved,
  errorMessage,
}: {
  sourceSpaceId: string
  itemId: string
  itemTitle: string
  onMoved: (destination: { id: string; title: string }) => void
  errorMessage?: string
}) {
  return (
    <SpaceMappingPopover
      sourceSpaceId={sourceSpaceId}
      itemId={itemId}
      onMoved={onMoved}
      errorMessage={errorMessage}
      trigger={({ ref, open, toggle }) => (
        <Tooltip label="Map to a client, campaign, or space" side="top">
          <button
            ref={ref}
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggle()
            }}
            className="btn-icon-bare shrink-0"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Move ${itemTitle} to another space`}
          >
            <FolderInput className="icon-xs" aria-hidden />
          </button>
        </Tooltip>
      )}
    />
  )
}
