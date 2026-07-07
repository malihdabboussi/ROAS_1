'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useHomeCardFeedScopes } from '@/features/home/components/cards/HomeCardRenderer'
import { DailyRecommendationStrip } from '@/features/home/components/DailyRecommendationStrip'
import { HomeCardsGrid } from '@/features/home/components/HomeCardsGrid'
import { HomeTaskDetailHost } from '@/features/home/components/HomeTaskDetailHost'
import { HOME_TOAST_ERRORS } from '@/features/home/config/home-toast-errors.config'
import { useHomeFeedOpen } from '@/features/home/hooks/use-home-feed-open'
import { prefetchOrgCampaigns } from '@/features/home/lib/home-feed-campaign-cache'
import { MissionDetailModal } from '@/features/mission-control/components/dialogs/MissionDetailModal'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { cachedSpaces, useCachedSpaces } from '@/features/spaces/hooks/use-cached-spaces'
import { useYourTurnFeed } from '@/features/spaces/hooks/use-your-turn-feed'
import { normalizeSpaceLegacyViews } from '@/features/spaces/lib/view-customization-merge'
import { ensureGeneralSpace } from '@/features/spaces/services/spaces.service'
import { useSpacesStore } from '@/features/spaces/store/use-spaces-store'
import type { Space } from '@/features/spaces/types'
import type { AttachedArtifact } from '@/features/studio/components/chat/ArtifactAttachments'
import { ChatInput } from '@/features/studio/components/ChatInput'
import { campaignListCacheKey, fetchCampaigns } from '@/features/studio/services/campaign.service'
import type { ChatModelSettings } from '@/features/studio/services/chat.service'
import { useChatStore } from '@/features/studio/store/use-chat-store'
import type { Campaign, DocumentAttachment, MessageReference } from '@/features/studio/types'
import { cachedFetch } from '@/lib/cache/keyed-fetch-cache'
import { createClient } from '@/lib/supabase/client'
import { sanitizeUserError } from '@/lib/utils/sanitize-user-error'

const HOME_CHAT_SEED_STORAGE_KEY = 'home-chat-seed'
function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const searchParams = useSearchParams()
  const [firstName, setFirstName] = useState('')
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
    const supabase = createClient()
    // getSession() reads the local session (no GoTrue network round-trip).
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
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-10 sm:px-4 lg:px-8">
        <h1 className="title-h2 text-foreground mb-6">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>

        {creditBalance !== null && creditBalance.totalAvailable <= 0 ? (
          <HomeCreditDepletedBanner canBuyCredits={!activeOrgId || canManageOrgBilling} />
        ) : null}

        <HomeComposer />

        <DailyRecommendationStrip />

        <HomeCardsGrid
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
    </div>
  )
}

function HomeCreditDepletedBanner({ canBuyCredits }: { canBuyCredits: boolean }) {
  return (
    <div className="banner-glass-amber mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="body-2 font-semibold">Credits are out</p>
        <p className="body-3 mt-1">
          {canBuyCredits
            ? 'I need credits before I can run agents, brain imports, or automations for this account.'
            : 'I need credits before I can run agents, brain imports, or automations here. Ask an owner or admin to add credits.'}
        </p>
      </div>
      {canBuyCredits ? (
        <button
          type="button"
          className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 shrink-0 font-medium"
          onClick={() => window.dispatchEvent(new CustomEvent('open-credit-purchase'))}
        >
          Add credits
        </button>
      ) : null}
    </div>
  )
}

function HomeComposer() {
  const router = useRouter()
  // Shared spaces resource — the sidebar already populates it, so the
  // composer adds zero extra /api/spaces requests.
  const { data: cachedSpaceRows } = useCachedSpaces()
  const spaces = useMemo(() => cachedSpaceRows ?? [], [cachedSpaceRows])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [targetSpaceId, setTargetSpaceId] = useState<string | null>(null)
  const [spaceOpen, setSpaceOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const isOrgOnly = useOrgStore((s) => s.isOrgOnly)

  useEffect(() => {
    let cancelled = false
    void cachedFetch(campaignListCacheKey(), fetchCampaigns, { ttlMs: 60_000 })
      .then((campaignRows) => {
        if (!cancelled) setCampaigns(campaignRows as Campaign[])
      })
      .catch(() => {
        if (!cancelled) setCampaigns([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const groupedSpaces = useMemo(() => {
    const generalCampaign =
      campaigns.find(
        (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
      ) ?? null
    const otherCampaigns = campaigns.filter((c) => c.id !== generalCampaign?.id)
    const sortedOthers = [...otherCampaigns].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? ''),
    )
    const ordered: Campaign[] = generalCampaign ? [generalCampaign, ...sortedOthers] : sortedOthers
    return ordered
      .map((campaign) => ({
        campaign,
        spaces: spaces
          .filter((s) => s.campaign_id === campaign.id)
          .sort((a, b) => {
            const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
            const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
            return bTime - aTime
          }),
      }))
      .filter((group) => group.spaces.length > 0)
  }, [campaigns, spaces])

  const defaultGeneralSpace = useMemo(() => {
    const generalCampaignId =
      campaigns.find(
        (c) => (c.config as Record<string, unknown> | undefined)?.system_kind === 'general',
      )?.id ?? null
    if (!generalCampaignId) return null
    return (
      [...spaces]
        .filter((space) => space.campaign_id === generalCampaignId)
        .sort((a, b) => {
          const aTime = new Date(a.updated_at ?? a.created_at ?? 0).getTime()
          const bTime = new Date(b.updated_at ?? b.created_at ?? 0).getTime()
          return bTime - aTime
        })[0] ?? null
    )
  }, [campaigns, spaces])

  const targetLabel = useMemo(() => {
    if (targetSpaceId) {
      return spaces.find((space) => space.id === targetSpaceId)?.title ?? 'Space'
    }
    if (isOrgOnly) return spaces[0]?.title ?? 'Workspace'
    return defaultGeneralSpace?.title ?? 'New Workspace'
  }, [defaultGeneralSpace, isOrgOnly, spaces, targetSpaceId])

  const activeCampaignId = useMemo(() => {
    if (targetSpaceId) {
      return spaces.find((space) => space.id === targetSpaceId)?.campaign_id ?? null
    }
    return defaultGeneralSpace?.campaign_id ?? null
  }, [defaultGeneralSpace, spaces, targetSpaceId])

  const handleSend = useCallback(
    async (
      content: string,
      documents?: DocumentAttachment[],
      artifacts?: AttachedArtifact[],
      model?: string,
      references?: MessageReference[],
      modelSettings?: ChatModelSettings,
    ) => {
      if (sending) return
      setSending(true)
      try {
        let targetId: string
        if (targetSpaceId) {
          targetId = targetSpaceId
        } else if (isOrgOnly) {
          const targetSpace = spaces[0]!
          targetId = targetSpace.id
        } else {
          const generalSpace = normalizeSpaceLegacyViews(await ensureGeneralSpace())
          targetId = generalSpace.id
          cachedSpaces.mutate((prev) => {
            const current = prev ?? []
            return current.some((space) => space.id === generalSpace.id)
              ? current
              : [generalSpace, ...current]
          })
          useSpacesStore.setState((state) => ({
            spaces: state.spaces.some((space) => space.id === generalSpace.id)
              ? state.spaces
              : [generalSpace, ...state.spaces],
          }))
        }
        useSpacesStore.getState().setChatCollapsed(false)
        useSpacesStore.getState().setChatRailIntent(null)
        window.sessionStorage.setItem(
          HOME_CHAT_SEED_STORAGE_KEY,
          JSON.stringify({
            space_id: targetId,
            content,
            documents,
            artifacts,
            model,
            references,
            modelSettings,
          }),
        )
        router.push(`/spaces?space=${targetId}&home_seed=1`)
      } catch (error) {
        setSending(false)
        toast.error(sanitizeUserError(error, HOME_TOAST_ERRORS.SEND_MESSAGE_FAILED.userMessage))
      }
    },
    [isOrgOnly, router, sending, spaces, targetSpaceId],
  )

  return (
    <div className="section-card card-elevated mb-6 overflow-visible">
      <div className="px-4 pb-3 pt-3 sm:px-5">
        <ChatInput
          onSend={handleSend}
          disabled={sending}
          agentKey="vibey"
          placeholder="Tell Vibey what to do..."
          wrapperClass="bg-transparent border-0 p-0 overflow-visible"
          composerFooterAfterIntegrationsSlot={
            <SpaceDropdown
              label={targetLabel}
              groupedSpaces={groupedSpaces}
              selectedId={targetSpaceId}
              isOrgOnly={isOrgOnly}
              defaultSpaceTitle={defaultGeneralSpace?.title ?? null}
              activeCampaignId={activeCampaignId}
              open={spaceOpen}
              onToggle={setSpaceOpen}
              onSelect={(id) => {
                setTargetSpaceId(id)
                setSpaceOpen(false)
              }}
            />
          }
        />
      </div>
    </div>
  )
}

function SpaceDropdown({
  label,
  groupedSpaces,
  selectedId,
  isOrgOnly,
  defaultSpaceTitle,
  activeCampaignId,
  open,
  onToggle,
  onSelect,
}: {
  label: string
  groupedSpaces: { campaign: Campaign; spaces: Space[] }[]
  selectedId: string | null
  isOrgOnly: boolean
  defaultSpaceTitle: string | null
  activeCampaignId: string | null
  open: boolean
  onToggle: (open: boolean) => void
  onSelect: (spaceId: string | null) => void
}) {
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setExpandedCampaignId(activeCampaignId ?? groupedSpaces[0]?.campaign.id ?? null)
  }, [open, activeCampaignId, groupedSpaces])

  return (
    <div className="relative">
      <button
        type="button"
        className="body-3 text-muted-foreground hover:text-foreground inline-flex max-w-[min(180px,100%)] items-center gap-0.5 truncate font-medium transition-colors"
        onClick={() => onToggle(!open)}
      >
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="z-modal-backdrop-inert" onClick={() => onToggle(false)} />
          <div className="dropdown-menu-solid absolute left-0 top-full mt-1 max-h-[360px] min-w-[260px] overflow-y-auto py-1">
            {!isOrgOnly ? (
              <button
                type="button"
                className={`body-3 hover:bg-hover-subtle flex w-full items-center justify-between gap-4 px-3 py-2 text-left transition-colors ${
                  selectedId === null ? 'text-foreground font-semibold' : 'text-foreground'
                }`}
                onClick={() => onSelect(null)}
              >
                <span className="min-w-0 flex-1 truncate">
                  {defaultSpaceTitle ?? 'New Workspace'}
                </span>
                <span className="typo-caption text-muted-foreground shrink-0">Default</span>
              </button>
            ) : null}
            {groupedSpaces.map(({ campaign, spaces: campaignSpaces }) => {
              const expanded = expandedCampaignId === campaign.id
              return (
                <div key={campaign.id} className="mt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedCampaignId((prev) => (prev === campaign.id ? null : campaign.id))
                    }
                    aria-expanded={expanded}
                    className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
                  >
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-semibold">{campaign.name}</span>
                    <span className="typo-caption text-muted-foreground shrink-0">
                      {campaignSpaces.length}
                    </span>
                  </button>
                  {expanded ? (
                    <div className="pb-1">
                      {campaignSpaces.map((space) => (
                        <button
                          key={space.id}
                          type="button"
                          className={`body-3 hover:bg-hover-subtle flex w-full items-center gap-4 py-1.5 pl-8 pr-3 text-left transition-colors ${
                            selectedId === space.id
                              ? 'text-foreground font-semibold'
                              : 'text-foreground'
                          }`}
                          onClick={() => onSelect(space.id)}
                        >
                          <span className="min-w-0 flex-1 truncate">{space.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </>
      ) : null}
    </div>
  )
}
