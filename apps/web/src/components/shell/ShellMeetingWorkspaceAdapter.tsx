'use client'

import { MeetingWorkspaceDialog } from '@/features/home/components/MeetingWorkspaceDialog'
import type { SpaceItem } from '@/lib/spaces/space-item-types'

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function isMeetingCallItem(item: SpaceItem): boolean {
  return text(item.custom_data?.entry_type) === 'call'
}

export function ShellMeetingWorkspaceAdapter({
  item,
  onClose,
}: {
  item: SpaceItem
  onClose: () => void
}) {
  const custom = item.custom_data ?? {}
  return (
    <div className="bg-background z-modal-content fixed inset-0">
      <MeetingWorkspaceDialog
        spaceId={item.space_id}
        meetingItemId={item.id}
        joinUrl={text(custom.video_url) ?? text(custom.location)}
        meetingStart={text(custom.call_date) ?? item.start_date}
        meetingEnd={text(custom.call_end) ?? item.due_date}
        fallbackTitle={item.title}
        onBack={onClose}
        onClose={onClose}
      />
    </div>
  )
}
