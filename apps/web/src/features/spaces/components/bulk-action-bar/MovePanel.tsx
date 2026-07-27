'use client'

import { useOtherSpacesByCampaign } from '../../hooks/use-other-spaces-by-campaign'
import { OtherSpacesSubmenuList } from '../OtherSpacesSubmenuList'
import { FloatingPanel } from './FloatingPanel'

export function MovePanel({
  anchorRef,
  activeSpaceId,
  sourceCampaignId,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  activeSpaceId: string
  sourceCampaignId: string | null
  onPick: (spaceId: string) => void
  onClose: () => void
}) {
  const { groups: otherSpaceGroups } = useOtherSpacesByCampaign(activeSpaceId)
  const rowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose}>
      <div className="px-spacing-1 py-spacing-1 max-h-64 overflow-y-auto">
        <OtherSpacesSubmenuList
          groups={otherSpaceGroups}
          sourceCampaignId={sourceCampaignId}
          menuOpen
          rowClassName={rowCls}
          emptyMessage="No other spaces"
          onPick={onPick}
        />
      </div>
    </FloatingPanel>
  )
}
