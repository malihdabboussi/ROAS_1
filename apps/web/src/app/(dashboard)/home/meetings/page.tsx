'use client'

import { AgendaCard } from '@/features/home/components/AgendaCard'
import { HomeMeetingDetailHost } from '@/features/home/components/HomeMeetingDetailHost'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { useHomeMeetingWorkRestore } from '@/features/home/hooks/use-home-meeting-work-restore'
import { MeetingsUnifiedSurface } from './MeetingsUnifiedSurface'

export default function HomeMeetingsPage() {
  const {
    activeYourTurnItem,
    activeMeetingEvent,
    openYourTurnItem,
    openMeetingEvent,
    closeYourTurnItem,
    closeMeetingEvent,
  } = useHomeFeedOpen()
  useHomeMeetingWorkRestore(openMeetingEvent, activeMeetingEvent)

  return (
    <>
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <h1 className="sr-only">MEETINGS</h1>
        {activeMeetingEvent ? (
          <HomeMeetingDetailHost
            key={`${activeMeetingEvent.source}:${activeMeetingEvent.id}`}
            event={activeMeetingEvent}
            onClose={closeMeetingEvent}
          />
        ) : activeYourTurnItem ? (
          <HomeTaskDetailHost
            item={activeYourTurnItem}
            presentation="panel"
            onClose={closeYourTurnItem}
          />
        ) : (
          <MeetingsUnifiedSurface
            agenda={
              <AgendaCard
                fullHeight
                presentation="page"
                onOpenItem={openYourTurnItem}
                onOpenMeeting={openMeetingEvent}
              />
            }
          />
        )}
      </main>
    </>
  )
}
