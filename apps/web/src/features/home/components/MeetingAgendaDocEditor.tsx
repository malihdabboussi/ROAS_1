'use client'

import { SpaceDocDeliverablePreview } from '@/components/deliverables/SpaceDocDeliverablePreview'

export function MeetingAgendaDocEditor({
  spaceId,
  itemId,
  title,
}: {
  spaceId: string
  itemId: string
  title: string
}) {
  return (
    <div className="border-border bg-card rounded-spacing-2 min-h-72 overflow-hidden border">
      <SpaceDocDeliverablePreview spaceId={spaceId} itemId={itemId} title={title} />
    </div>
  )
}
