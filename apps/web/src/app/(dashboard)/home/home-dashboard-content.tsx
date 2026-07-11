'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { HomeDashboardV4Composer } from '@/components/home-dashboard-v4/HomeDashboardV4Composer'
import {
  HomeDashboardV4Greeting,
  HomeDashboardV4Shell,
} from '@/components/home-dashboard-v4/HomeDashboardV4Shell'
import { HomeTemplateFan } from '@/components/home-dashboard-v4/HomeTemplateFan'
import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { DailyRecommendationStrip } from '@/features/home/components/DailyRecommendationStrip'
import { HomeCardsGrid } from '@/features/home/components/HomeCardsGrid'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import type { HomeDashboardTemplateId } from '@/features/home/config/home-dashboard-v4.config'
import { HomeDashboardVisualProvider } from '@/features/home/context/home-dashboard-visual-context'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { prefetchOrgCampaigns } from '@/features/home/lib/home-feed-campaign-cache'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import { createClient } from '@/lib/supabase/client'

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
  const {
    selectedMission,
    activeYourTurnItem,
    openYourTurnItem,
    openNotification,
    openMissionById,
    closeMission,
    closeYourTurnItem,
  } = useHomeFeedOpen()
  const memberships = useOrgStore((s) => s.memberships)
  const activeOrgId = useOrgStore((s) => s.activeOrgId)
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

  return (
    <HomeDashboardVisualProvider variant="v4">
      <div className="flex min-h-0 flex-1 flex-col">
        <HomeDashboardV4Shell>
          <HomeDashboardV4Greeting greeting={greeting} firstName={firstName} />

          {creditBalance !== null && creditBalance.totalAvailable <= 0 ? (
            <HomeCreditDepletedBanner canBuyCredits={!activeOrgId || canManageOrgBilling} />
          ) : null}

          <HomeDashboardV4Composer selectedTemplate={selectedTemplate} />

          <HomeTemplateFan selected={selectedTemplate} onSelect={setSelectedTemplate} />

          <DailyRecommendationStrip variant="v4" />

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
