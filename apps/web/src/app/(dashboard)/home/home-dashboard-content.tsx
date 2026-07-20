'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HomeDashboardV4Shell } from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { HomeCardsGrid } from '@/features/home/components/HomeCardsGrid'
import { HomeMeetingDetailHost } from '@/features/home/components/HomeMeetingDetailHost'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import { HomeDashboardVisualProvider } from '@/features/home/context/home-dashboard-visual-context'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { prefetchOrgCampaigns } from '@/features/home/lib/home-feed-campaign-cache'
import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { runMeetingsPrecallPrepEvent } from '@/lib/services/calendar-api'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

export function HomeDashboardContent() {
  const searchParams = useSearchParams()
  const {
    selectedMission,
    activeYourTurnItem,
    activeMeetingEvent,
    openYourTurnItem,
    openYourTurnItemFromMeeting,
    openMeetingEvent,
    openNotification,
    openMissionById,
    closeMission,
    closeYourTurnItem,
    closeMeetingEvent,
  } = useHomeFeedOpen()
  const memberships = useOrgStore((s) => s.memberships)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
  const [meetingPrepBusy, setMeetingPrepBusy] = useState(false)
  const { myTasks, approval } = useHomeCardFeedScopes()
  const myTasksFeed = useYourTurnFeed(myTasks.scope)
  const approvalFeed = useYourTurnFeed(approval.scope)

  useEffect(() => {
    for (const m of memberships) {
      void prefetchOrgCampaigns(m.org_id).catch(() => {})
    }
  }, [memberships])

  useEffect(() => {
    const missionId = searchParams.get('mission')
    if (!missionId) return
    void openMissionById(missionId, activeOrgId ?? null)
  }, [searchParams, openMissionById, activeOrgId])

  const handleFeedsUpdated = useCallback(() => {
    void myTasksFeed.reload()
    void approvalFeed.reload()
  }, [myTasksFeed, approvalFeed])

  const handleStartMeetingPrep = useCallback(async () => {
    if (!activeMeetingEvent) return
    const spaceId = await resolveMeetingsSpaceId()
    if (!spaceId) {
      toast.error(HOME_TOAST_ERRORS.MEETINGS_SPACE_REQUIRED.userMessage)
      return
    }
    setMeetingPrepBusy(true)
    try {
      const result = await runMeetingsPrecallPrepEvent({
        spaceId,
        calendarEventId: activeMeetingEvent.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        refresh: true,
      })
      toast.success(HOME_TOAST_SUCCESS.PREP_STARTED.userMessage)
      closeMeetingEvent()
      openYourTurnItem(minimalSpaceYourTurnItem(spaceId, result.space_item_id, result.title, null))
    } catch (error) {
      toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.PREP_START_FAILED.userMessage))
    } finally {
      setMeetingPrepBusy(false)
    }
  }, [activeMeetingEvent, closeMeetingEvent, openYourTurnItem])

  return (
    <HomeDashboardVisualProvider variant="v4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HomeDashboardV4Shell>
          <HomeCardsGrid
            variant="v4"
            myTasksScope={myTasks.scope}
            updateMyTasksScope={myTasks.updateScope}
            approvalScope={approval.scope}
            updateApprovalScope={approval.updateScope}
            myTasksLoading={myTasksFeed.loading}
            approvalLoading={approvalFeed.loading}
            myTasksItems={myTasksFeed.items}
            approvalItems={approvalFeed.items}
            onOpenItem={(item) => void openYourTurnItem(item)}
            onOpenMeeting={openMeetingEvent}
            onNotificationClick={(n) => void openNotification(n)}
            onMyTasksChanged={handleFeedsUpdated}
            onAccept={approvalFeed.acceptSuggestion}
            onDismiss={approvalFeed.dismissSuggestion}
          />
        </HomeDashboardV4Shell>
      </div>

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={closeMission}
          onUpdated={handleFeedsUpdated}
        />
      ) : null}

      {activeMeetingEvent ? (
        <HomeMeetingDetailHost
          event={activeMeetingEvent}
          onClose={closeMeetingEvent}
          prepBusy={meetingPrepBusy}
          onOpenPrep={() => {
            const prep = activeMeetingEvent.prep
            if (!prep || prep.status === 'failed') {
              void handleStartMeetingPrep()
              return
            }
            openYourTurnItemFromMeeting(
              minimalSpaceYourTurnItem(
                prep.space_id,
                prep.space_item_id,
                prep.title ?? `Prep — ${activeMeetingEvent.title}`,
                null,
              ),
            )
          }}
          onStartPrep={() => void handleStartMeetingPrep()}
          onOpenSpaceItem={(spaceId, itemId, title) => {
            openYourTurnItemFromMeeting(minimalSpaceYourTurnItem(spaceId, itemId, title, null))
          }}
        />
      ) : null}

      {activeYourTurnItem ? (
        <HomeTaskDetailHost
          item={activeYourTurnItem}
          onClose={closeYourTurnItem}
          onUpdated={handleFeedsUpdated}
        />
      ) : null}
    </HomeDashboardVisualProvider>
  )
}
