'use client'

import { InboxFeed } from '@/components/notifications'
import type { UserNotification } from '@/lib/notifications'

export function InboxFeedCard({
  onOpenDetails,
}: {
  onOpenDetails: (notification: UserNotification) => void | Promise<void>
}) {
  // Bounded height so list/detail overflow-y-auto can activate (matches Agenda card).
  return (
    <div className="flex h-[420px] min-h-0 flex-col overflow-hidden">
      <InboxFeed onOpenDetails={onOpenDetails} />
    </div>
  )
}
