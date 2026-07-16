'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HomeDashboardV4Composer } from '@/components/home-dashboard-v4/HomeDashboardV4Composer'
import {
  HomeChatHeroToggle,
  HomeDashboardV4Greeting,
  HomeDashboardV4Shell,
} from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { HomeTemplateFan } from '@/components/home-dashboard-v4/HomeTemplateFan'
import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { DailyRecommendationStrip } from '@/features/home/components/DailyRecommendationStrip'
import { HomeCardsGrid } from '@/features/home/components/HomeCardsGrid'
import { HomeMeetingDetailHost } from '@/features/home/components/HomeMeetingDetailHost'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import type { HomeDashboardTemplateId } from '@/features/home/config/home-dashboard-v4.config'
import { HOME_TOAST_ERRORS, HOME_TOAST_SUCCESS } from '@/features/home/config/home-toast-errors.config'
import { minimalSpaceYourTurnItem } from '@/features/home/lib/home-your-turn-item'
import { resolveMeetingsSpaceId } from '@/features/home/lib/resolve-meetings-space-id'
import { HomeDashboardVisualProvider } from '@/features/home/context/home-dashboard-visual-context'
import { useHomeChatHeroCollapsed } from '@/features/home/hooks/use-home-chat-hero-collapsed'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { prefetchOrgCampaigns } from '@/features/home/lib/home-feed-campaign-cache'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { runMeetingsPrecallPrepEvent } from '@/lib/services/calendar-api'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function HomeDashboardContent() {
  const searchParams = useSearchParams()
  const [firstName, setFirstName] = useState('')
  const [greeting, setGreeting] = useState('Welcome back')
  const [selectedTemplate, setSelectedTemplate] = useState<HomeDashboardTemplateId | null>(null)
  const { collapsed: chatCollapsed, toggle: toggleChatHero } = useHomeChatHeroCollapsed()
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
  const canManageOrgBilling = useOrgStore((s) => s.hasMinRole('admin'))
  const creditBalance = useChatStore((s) => s.creditBalance)
  const { myTasks, approval } = useHomeCardFeedScopes()
  const myTasksFeed = useYourTurnFeed(myTasks.scope)
  const approvalFeed = useYourTurnFeed(approval.scope)

  useEffect(() => {
    setGreeting(getGreeting())

    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      const meta = user.user_metadata as Record<string, unknown> | undefined
      const fullName =
        (meta?.full_name as string) ?? (meta?.name as string) ?? user.email?.split('@')[0] ?? ''
      setFirstName(fullName.split(' ')[0] ?? fullName)
    })
  }, [])

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
    const spaceId = resolveMeetingsSpaceId()
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
      openYourTurnItem(
        minimalSpaceYourTurnItem(spaceId, result.space_item_id, result.title, activeOrgId),
      )
    } catch (error) {
      toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.PREP_START_FAILED.userMessage))
    } finally {
      setMeetingPrepBusy(false)
    }
  }, [activeMeetingEvent, activeOrgId, closeMeetingEvent, openYourTurnItem])

  return (
    <HomeDashboardVisualProvider variant="v4">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <HomeDashboardV4Shell chatCollapsed={chatCollapsed}>
          {chatCollapsed ? (
            <HomeChatHeroToggle collapsed onToggle={toggleChatHero} />
          ) : (
            <>
              <HomeDashboardV4Greeting greeting={greeting} firstName={firstName} />

              {creditBalance !== null && creditBalance.totalAvailable <= 0 ? (
                <HomeCreditDepletedBanner canBuyCredits={!activeOrgId || canManageOrgBilling} />
              ) : null}

              <HomeDashboardV4Composer
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
              />

              <HomeTemplateFan selected={selectedTemplate} onSelect={setSelectedTemplate} />

              <DailyRecommendationStrip variant="v4" />

              <HomeChatHeroToggle collapsed={false} onToggle={toggleChatHero} />
            </>
          )}

          {chatCollapsed && creditBalance !== null && creditBalance.totalAvailable <= 0 ? (
            <HomeCreditDepletedBanner canBuyCredits={!activeOrgId || canManageOrgBilling} />
          ) : null}

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
                activeOrgId,
              ),
            )
          }}
          onStartPrep={() => void handleStartMeetingPrep()}
          onOpenSpaceItem={(spaceId, itemId, title) => {
            openYourTurnItemFromMeeting(
              minimalSpaceYourTurnItem(spaceId, itemId, title, activeOrgId),
            )
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

function HomeCreditDepletedBanner({ canBuyCredits }: { canBuyCredits: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--hd4-primary-border)] bg-[var(--hd4-primary-soft)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[15px] font-semibold text-[var(--hd4-text)]">Credits are out</p>
        <p className="mt-1 text-[13px] text-[var(--hd4-text-2)]">
          {canBuyCredits
            ? 'I need credits before I can run agents, brain imports, or automations for this account.'
            : 'I need credits before I can run agents, brain imports, or automations here. Ask an owner or admin to add credits.'}
        </p>
      </div>
      {canBuyCredits ? (
        <button
          type="button"
          className="hd4-rec-cta shrink-0"
          onClick={() => window.dispatchEvent(new CustomEvent('open-credit-purchase'))}
        >
          Add credits
        </button>
      ) : null}
    </div>
  )
}
