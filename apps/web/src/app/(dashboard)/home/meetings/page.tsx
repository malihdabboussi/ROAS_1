'use client'

import { AgendaCard } from '@/features/home/components/AgendaCard'
import { HomeMeetingDetailHost } from '@/features/home/components/HomeMeetingDetailHost'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { useHomeMeetingActions } from '@/features/home/hooks/use-home-meeting-actions'

export default function HomeMeetingsPage() {
  const {
    activeYourTurnItem,
    activeMeetingEvent,
    openYourTurnItem,
    openYourTurnItemFromMeeting,
    openMeetingEvent,
    closeYourTurnItem,
    closeMeetingEvent,
  } = useHomeFeedOpen()
  const { meetingPrepBusy, startMeetingPrep, openMeetingPrep } = useHomeMeetingActions({
    activeMeetingEvent,
    closeMeetingEvent,
    openYourTurnItem,
    openYourTurnItemFromMeeting,
  })

  return (
    <>
      <main className="p-spacing-4 flex min-h-0 flex-1">
        <h1 className="sr-only">MEETINGS</h1>
        <AgendaCard fullHeight onOpenItem={openYourTurnItem} onOpenMeeting={openMeetingEvent} />
      </main>
      {activeMeetingEvent ? (
        <HomeMeetingDetailHost
          event={activeMeetingEvent}
          onClose={closeMeetingEvent}
          prepBusy={meetingPrepBusy}
          onOpenPrep={openMeetingPrep}
          onStartPrep={() => void startMeetingPrep()}
        />
      ) : null}
      {activeYourTurnItem ? (
        <HomeTaskDetailHost item={activeYourTurnItem} onClose={closeYourTurnItem} />
      ) : null}
    </>
  )
}
