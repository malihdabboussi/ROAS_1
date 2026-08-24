'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LayoutDashboard, Lock, StickyNote, Type } from 'lucide-react'
import { toast } from 'sonner'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { fetchMissions } from '@/features/mission-control/services/missions.service'
import type { Mission } from '@/features/mission-control/types'
import { MainDashboardOverview } from '@/features/studio/components/preview/MainDashboardOverview'
import {
  fetchCampaignLeaderboard,
  fetchCampaignMainDashboard,
  fetchCampaignReportingWidgets,
  fetchCampaignSocialAnalytics,
  fetchCampaignStripeOverview,
  type CampaignLeaderboardRow,
  type CampaignReportingWidgetsResponse,
  type CampaignStripeOverview,
  type MainDashboardResponse,
  type SocialAnalyticsResponse,
} from '@/features/studio/services/analytics.service'
import { SPACES_REPORTING_TOAST_ERRORS } from '../../config/spaces-toast-errors.config'
import type { SpaceItem } from '../../types'
import type { ViewDef } from '../../types/space-schema'
import { newOverviewCustomWidgetId } from './overview-section-layout'
import { PageGraderCampaignOverviewView } from './PageGraderCampaignOverviewView'
import {
  OVERVIEW_CHANNEL_BY_SECTION_ID,
  OVERVIEW_CHANNEL_IDS,
  OVERVIEW_VISIBILITY_KEY_BY_SECTION_ID,
  REPORTING_DISPLAY_ITEMS_BY_TYPE,
} from './reporting-display-items'
import { normalizeReportingSocialPlatforms } from './shared/reporting-social-platforms'
import type { ReportingToolbarApi } from './shared/reporting-toolbar.types'
import { resolveReportingDates } from './shared/resolve-reporting-dates'

interface CampaignOverviewViewProps {
  campaignId: string
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => void
  onRegisterReportingToolbar?: (api: ReportingToolbarApi | null) => void
  pageGraderClientId?: string | null
  pageGraderCampaignId?: string | null
  spaceItems?: SpaceItem[]
  spaceId?: string | null
  onOpenTask?: (item: SpaceItem) => void
}

export function CampaignOverviewView({
  pageGraderClientId,
  pageGraderCampaignId,
  spaceItems = [],
  spaceId,
  onOpenTask,
  ...props
}: CampaignOverviewViewProps) {
  if (pageGraderClientId && pageGraderCampaignId && onOpenTask) {
    return (
      <PageGraderCampaignOverviewView
        clientId={pageGraderClientId}
        pageGraderCampaignId={pageGraderCampaignId}
        spaceItems={spaceItems}
        spaceId={spaceId || ''}
        onOpenTask={onOpenTask}
      />
    )
  }
  return <NativeCampaignOverviewView {...props} />
}

function NativeCampaignOverviewView({
  campaignId,
  activeView,
  onViewPatch,
  onRegisterReportingToolbar,
}: CampaignOverviewViewProps) {
  const config = activeView.reporting_config ?? {}
  const { startDate: resolvedStart, endDate: resolvedEnd } = resolveReportingDates(config)
  const dateKey = `${resolvedStart ?? 'all'}|${resolvedEnd ?? ''}`
  const [data, setData] = useState<MainDashboardResponse | null>(null)
  const [stripeOverview, setStripeOverview] = useState<CampaignStripeOverview | null>(null)
  const [missions, setMissions] = useState<Mission[] | null>(null)
  const [socialAnalytics, setSocialAnalytics] = useState<SocialAnalyticsResponse | null>(null)
  const [reportingWidgets, setReportingWidgets] = useState<CampaignReportingWidgetsResponse | null>(
    null,
  )
  const [campaignLeaderboard, setCampaignLeaderboard] = useState<CampaignLeaderboardRow[] | null>(
    null,
  )
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardEditMode, setDashboardEditMode] = useState(false)
  const hasLoadedOnce = useRef(false)

  const loadData = useCallback(
    async (opts: { refresh?: boolean } = {}) => {
      if (!hasLoadedOnce.current) setInitialLoading(true)
      else setRefreshing(true)
      try {
        const fromUnix =
          resolvedStart !== undefined && resolvedStart !== null
            ? Math.floor(new Date(`${resolvedStart}T00:00:00`).getTime() / 1000)
            : undefined
        const toUnix =
          resolvedEnd !== undefined && resolvedEnd !== null
            ? Math.floor(new Date(`${resolvedEnd}T23:59:59`).getTime() / 1000)
            : undefined
        const platforms = normalizeReportingSocialPlatforms(config)
        const platform = platforms[0] ?? 'instagram'
        const connectionId =
          platform === 'instagram'
            ? (config.social_instagram_connection_id ?? undefined)
            : (config.social_linkedin_connection_id ?? undefined)
        const [main, stripe, missionRows, social, widgets, board] = await Promise.all([
          fetchCampaignMainDashboard(campaignId, {
            since: resolvedStart,
            until: resolvedEnd,
            refresh: opts.refresh,
          }),
          fetchCampaignStripeOverview(campaignId, fromUnix, toUnix).catch(() => null),
          fetchMissions({ campaign_id: campaignId, limit: 100 }),
          fetchCampaignSocialAnalytics(campaignId, platform, {
            since: resolvedStart,
            until: resolvedEnd,
            refresh: opts.refresh,
            connectionId,
          }),
          fetchCampaignReportingWidgets(
            campaignId,
            resolvedStart ?? undefined,
            resolvedEnd ?? undefined,
          ),
          fetchCampaignLeaderboard(resolvedStart ?? undefined, resolvedEnd ?? undefined, 8),
        ])
        setData(main)
        setStripeOverview(stripe)
        setMissions(missionRows)
        setSocialAnalytics(social)
        setReportingWidgets(widgets)
        setCampaignLeaderboard(board)
        hasLoadedOnce.current = true
      } catch {
        toast.error(SPACES_REPORTING_TOAST_ERRORS.CAMPAIGN_OVERVIEW_LOAD_FAILED.userMessage)
      } finally {
        setInitialLoading(false)
        setRefreshing(false)
      }
    },
    [
      campaignId,
      dateKey,
      config.social_platform,
      config.social_platforms,
      config.social_instagram_connection_id,
      config.social_linkedin_connection_id,
    ],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!onRegisterReportingToolbar) return
    onRegisterReportingToolbar({
      refresh: () => loadData({ refresh: true }),
      refreshing: initialLoading || refreshing,
    })
    return () => onRegisterReportingToolbar(null)
  }, [onRegisterReportingToolbar, loadData, initialLoading, refreshing])

  const addOverviewCustomWidget = useCallback(
    (kind: 'heading' | 'note') => {
      const id = newOverviewCustomWidgetId(kind)
      const widgets = [...(config.overview_custom_widgets ?? [])]
      if (kind === 'heading') {
        widgets.push({ id, kind: 'heading', title: 'Title', subtitle: 'Subtitle' })
      } else {
        widgets.push({ id, kind: 'note', body: 'Note' })
      }
      void onViewPatch({ reporting_config: { ...config, overview_custom_widgets: widgets } })
    },
    [config, onViewPatch],
  )

  const onOverviewCustomWidgetChange = useCallback(
    (id: string, patch: Partial<{ title: string; subtitle: string; body: string }>) => {
      const widgets = (config.overview_custom_widgets ?? []).map((w) => {
        if (w.id !== id) return w
        if (w.kind === 'heading') {
          return {
            ...w,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
          }
        }
        return {
          ...w,
          ...(patch.body !== undefined ? { body: patch.body } : {}),
        }
      })
      void onViewPatch({ reporting_config: { ...config, overview_custom_widgets: widgets } })
    },
    [config, onViewPatch],
  )

  const onOverviewCustomWidgetRemove = useCallback(
    (id: string) => {
      void onViewPatch({
        reporting_config: {
          ...config,
          overview_custom_widgets: (config.overview_custom_widgets ?? []).filter(
            (w) => w.id !== id,
          ),
          overview_dashboard_layout: (config.overview_dashboard_layout ?? []).filter(
            (l) => l.i !== id,
          ),
        },
      })
    },
    [config, onViewPatch],
  )

  const onOverviewSectionHide = useCallback(
    (sectionId: string) => {
      const channelId = OVERVIEW_CHANNEL_BY_SECTION_ID[sectionId]
      if (channelId) {
        const current = config.overview_channels ?? OVERVIEW_CHANNEL_IDS
        const next = OVERVIEW_CHANNEL_IDS.filter((c) => c !== channelId && current.includes(c))
        void onViewPatch({
          reporting_config: {
            ...config,
            overview_channels: next.length === OVERVIEW_CHANNEL_IDS.length ? undefined : next,
          },
        })
        return
      }
      const visibilityKey = OVERVIEW_VISIBILITY_KEY_BY_SECTION_ID[sectionId] ?? sectionId
      const allDisplayIds = (REPORTING_DISPLAY_ITEMS_BY_TYPE.campaign_overview ?? []).map(
        (d) => d.id,
      )
      const currentSet = new Set(config.visible_kpis?.length ? config.visible_kpis : allDisplayIds)
      currentSet.delete(visibilityKey)
      const next = allDisplayIds.filter((id) => currentSet.has(id))
      void onViewPatch({
        reporting_config: {
          ...config,
          visible_kpis: next.length === allDisplayIds.length ? undefined : next,
        },
      })
    },
    [config, onViewPatch],
  )

  return (
    <div className="scrollbar-thin flex h-0 min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-3">
      {initialLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <VibeyLoadingOrb size="sm" text="Loading overview..." />
        </div>
      ) : (
        <>
          <div className="gap-spacing-2 mb-2 flex shrink-0 flex-wrap items-center justify-end">
            {dashboardEditMode ? (
              <>
                <button
                  type="button"
                  aria-label="Add title and subtitle block"
                  onClick={() => addOverviewCustomWidget('heading')}
                  className="chip-glass-neutral typo-caption text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <Type className="icon-xs shrink-0" />
                  Title
                </button>
                <button
                  type="button"
                  aria-label="Add note card"
                  onClick={() => addOverviewCustomWidget('note')}
                  className="chip-glass-neutral typo-caption text-muted-foreground hover:bg-hover-subtle hover:text-foreground inline-flex items-center gap-1 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <StickyNote className="icon-xs shrink-0" />
                  Note
                </button>
              </>
            ) : null}
            <button
              type="button"
              aria-label={dashboardEditMode ? 'Lock dashboard layout' : 'Edit dashboard layout'}
              onClick={() => setDashboardEditMode((v) => !v)}
              className="text-muted-foreground hover:bg-hover-subtle hover:text-foreground rounded-spacing-2 inline-flex items-center justify-center p-2 transition-colors"
            >
              {dashboardEditMode ? (
                <Lock className="icon-sm text-foreground" />
              ) : (
                <LayoutDashboard className="icon-sm text-foreground" />
              )}
            </button>
          </div>
          <MainDashboardOverview
            data={data}
            stripeOverview={stripeOverview}
            missions={missions}
            socialAnalytics={socialAnalytics}
            reportingWidgets={reportingWidgets}
            campaignLeaderboard={campaignLeaderboard}
            campaignId={campaignId}
            refreshing={refreshing}
            reportingConfig={config}
            overviewDashboardEditMode={dashboardEditMode}
            overviewDashboardSavedLayout={config.overview_dashboard_layout}
            onOverviewDashboardLayoutPersist={(layout) => {
              void onViewPatch({
                reporting_config: {
                  ...config,
                  overview_dashboard_layout: layout,
                },
              })
            }}
            onOverviewCustomWidgetChange={onOverviewCustomWidgetChange}
            onOverviewCustomWidgetRemove={onOverviewCustomWidgetRemove}
            onOverviewSectionHide={onOverviewSectionHide}
          />
        </>
      )}
    </div>
  )
}
