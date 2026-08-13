'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { HomeDashboardV4Shell } from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { HomeCardsGrid } from '@/features/home/components/HomeCardsGrid'
import { HomeMeetingDetailHost } from '@/features/home/components/HomeMeetingDetailHost'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { HomeDashboardVisualProvider } from '@/features/home/context/home-dashboard-visual-context'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { useHomeMeetingActions } from '@/features/home/hooks/use-home-meeting-actions'
import { useHomeMeetingWorkRestore } from '@/features/home/hooks/use-home-meeting-work-restore'
import { prefetchOrgCampaigns } from '@/features/home/lib/home-feed-campaign-cache'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'

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

  const { openMeetingPrep } = useHomeMeetingActions({
    activeMeetingEvent,
    closeMeetingEvent,
    openYourTurnItem,
    openYourTurnItemFromMeeting,
  })
  useHomeMeetingWorkRestore(openMeetingEvent, activeMeetingEvent)

  return (
    <HomeDashboardVisualProvider variant="v4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {activeMeetingEvent ? (
          <HomeMeetingDetailHost
            event={activeMeetingEvent}
            onClose={closeMeetingEvent}
            onOpenPrep={openMeetingPrep}
          />
        ) : activeYourTurnItem ? (
          <HomeTaskDetailHost
            item={activeYourTurnItem}
            presentation="panel"
            onClose={closeYourTurnItem}
            onUpdated={handleFeedsUpdated}
          />
        ) : (
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
        )}
      </div>

      {selectedMission ? (
        <MissionDetailModal
          mission={selectedMission}
          onClose={closeMission}
          onUpdated={handleFeedsUpdated}
        />
      ) : null}
    </HomeDashboardVisualProvider>
  )
}
