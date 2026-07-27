'use client'

import { InboxFeed } from '@/components/notifications'
import type { UserNotification } from '@/lib/notifications'

export function InboxFeedCard({
  onOpenDetails,
}: {
  onOpenDetails: (notification: UserNotification) => void | Promise<void>
}) {
  return (
    <div className="h-full min-h-0">
      <InboxFeed onOpenDetails={onOpenDetails} />
    </div>
  )
}
