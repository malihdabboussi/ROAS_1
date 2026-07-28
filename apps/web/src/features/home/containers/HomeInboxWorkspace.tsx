'use client'

import { MissionDetailModal } from '@/components/missions/MissionDetailModalAdapter'
import { InboxFeed } from '@/components/notifications'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'

export function HomeInboxWorkspace() {
  const { selectedMission, activeYourTurnItem, openNotification, closeMission, closeYourTurnItem } =
    useHomeFeedOpen()

  return (
    <>
      <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <h1 className="sr-only">INBOX</h1>
        <InboxFeed presentation="page" onOpenDetails={openNotification} />
      </main>

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={closeMission}
          onUpdated={() => undefined}
        />
      ) : null}

      {activeYourTurnItem ? (
        <HomeTaskDetailHost item={activeYourTurnItem} onClose={closeYourTurnItem} />
      ) : null}
    </>
  )
}
