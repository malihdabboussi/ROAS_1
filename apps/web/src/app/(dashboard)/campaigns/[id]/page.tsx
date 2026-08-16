'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Columns3,
  FolderOpen,
  LayoutGrid,
  List,
  Menu,
  PanelsTopLeft,
  PieChart,
} from 'lucide-react'
import { CampaignCanvasView } from '@/components/canvas'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tabs, TabsContent } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import type { CampaignPatch } from '@/features/agency-clients/AgencyCampaignEditPanel'
import { AgencyClientCampaignsPanel } from '@/features/agency-clients/AgencyClientCampaignsPanel'
import { AgencyClientMeetingsPanel } from '@/features/agency-clients/AgencyClientMeetingsPanel'
import { AgencyClientWorkspaceOverview } from '@/features/agency-clients/AgencyClientWorkspaceOverview'
import { updateCampaign } from '@/features/studio/services/campaign.service'
import { CampaignTeamManageModal } from '@/features/team/components/CampaignTeamManageModal'
import { useUserRole } from '@/hooks/use-user-role'
import {
  fetchAgencyClient,
  updateAgencyWorkspaceEntity,
  type AgencyClientWorkspace,
} from '@/lib/agency-clients'
import { CampaignHeader } from './_components/CampaignHeader'
import { CampaignAssetsTab } from './_components/tabs/CampaignAssetsTab'
import { CampaignDashboardTab } from './_components/tabs/CampaignDashboardTab'
import { CampaignKnowledgeTab } from './_components/tabs/CampaignKnowledgeTab'
import { CampaignOverviewTab } from './_components/tabs/CampaignOverviewTab'
import { CampaignReportingTab } from './_components/tabs/CampaignReportingTab'
import { CampaignTaskTab } from './_components/tabs/CampaignTaskTab'
import { useCampaignAutosave } from './_hooks/use-campaign-autosave'
import { useCampaignDetailData } from './_hooks/use-campaign-detail-data'
import {
  CAMPAIGN_TAB_ICONS,
  CAMPAIGN_TAB_LABELS,
  DEFAULT_CAMPAIGN_TAB,
  normalizeCampaignTabId,
  readVisibleCampaignTabs,
  type ToggleableCampaignTabId,
} from './_lib/campaign-nav-tabs'

const MOBILE_TAB_ICONS: Partial<Record<ToggleableCampaignTabId, typeof BarChart3>> = {
  overview: LayoutGrid,
  dashboard: BarChart3,
  list: List,
  board: Columns3,
  calendar: CalendarDays,
  canvas: PanelsTopLeft,
  assets: FolderOpen,
  knowledge: BookOpen,
  reporting: PieChart,
}

const CLIENT_WORKSPACE_NAV_TABS = [
  { value: 'overview', label: 'Overview', icon: 'layout-grid' },
  { value: 'dashboard', label: 'Campaigns', icon: 'folder-kanban' },
  { value: 'list', label: 'Tasks & Requests', icon: 'list' },
  { value: 'reporting', label: 'Performance', icon: 'pie-chart' },
  { value: 'calendar', label: 'Meetings', icon: 'calendar-days' },
  { value: 'knowledge', label: 'Brain', icon: 'brain' },
] as const

const CLIENT_WORKSPACE_TAB_IDS = new Set<string>(CLIENT_WORKSPACE_NAV_TABS.map((tab) => tab.value))

function resolveTabFromSearch(viewParam: string | null, tabParam: string | null): string {
  const normalized =
    normalizeCampaignTabId(viewParam ?? '') ?? normalizeCampaignTabId(tabParam ?? '')
  return normalized ?? DEFAULT_CAMPAIGN_TAB
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: roleLoading } = useUserRole()
  const [isMobile, setIsMobile] = useState(false)

  const [activeTab, setActiveTab] = useState(() =>
    resolveTabFromSearch(searchParams.get('view'), searchParams.get('tab')),
  )
  const [completionChartType, setCompletionChartType] = useState<'bar' | 'area' | 'line' | 'pie'>(
    'bar',
  )
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false)
  const [completionDays, setCompletionDays] = useState(14)
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false)
  const [offerPage, setOfferPage] = useState(0)
  const [avatarPage, setAvatarPage] = useState(0)
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [clientWorkspace, setClientWorkspace] = useState<AgencyClientWorkspace | null>(null)
  const [clientWorkspaceLoading, setClientWorkspaceLoading] = useState(false)
  const [clientWorkspaceError, setClientWorkspaceError] = useState<string | null>(null)
  const [editingClientCampaignId, setEditingClientCampaignId] = useState<string | null>(null)
  const [updatingClientCampaignId, setUpdatingClientCampaignId] = useState<string | null>(null)

  useEffect(() => {
    if (!chartDropdownOpen && !timeframeDropdownOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setChartDropdownOpen(false)
        setTimeframeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [chartDropdownOpen, timeframeDropdownOpen])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      const params = new URLSearchParams(searchParams.toString())
      params.delete('tab')
      if (value === DEFAULT_CAMPAIGN_TAB) params.delete('view')
      else params.set('view', value)
      const qs = params.toString()
      router.replace(`/campaigns/${id}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [id, router, searchParams],
  )

  const canAccess = true
  const detail = useCampaignDetailData({
    campaignId: id,
    roleLoading,
    canAccess,
  })
  const autosave = useCampaignAutosave(
    id,
    detail.context,
    detail.resources,
    detail.dataReadyRef.current,
  )

  const pageGraderClientId = useMemo(() => {
    const routeClientId = searchParams.get('client')?.trim()
    if (routeClientId) return routeClientId
    const config = recordValue(detail.campaign?.config)
    const externalSources = recordValue(config.external_sources)
    return stringValue(recordValue(externalSources.page_grader).client_id)
  }, [detail.campaign?.config, searchParams])
  const isClientWorkspace = Boolean(pageGraderClientId)

  useEffect(() => {
    if (!pageGraderClientId) {
      setClientWorkspace(null)
      setClientWorkspaceError(null)
      return
    }
    let cancelled = false
    setClientWorkspaceLoading(true)
    setClientWorkspaceError(null)
    void fetchAgencyClient(pageGraderClientId, false)
      .then((workspace) => {
        if (!cancelled) setClientWorkspace(workspace)
      })
      .catch((reason) => {
        if (cancelled) return
        setClientWorkspaceError(reason instanceof Error ? reason.message : 'Could not load client')
      })
      .finally(() => {
        if (!cancelled) setClientWorkspaceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pageGraderClientId])

  useEffect(() => {
    const current = resolveTabFromSearch(searchParams.get('view'), searchParams.get('tab'))
    if (searchParams.get('tab') && !searchParams.get('view')) {
      handleTabChange(current)
      return
    }
    if (!detail.campaign) {
      setActiveTab(current)
      return
    }

    if (isClientWorkspace) {
      const next = CLIENT_WORKSPACE_TAB_IDS.has(current) ? current : DEFAULT_CAMPAIGN_TAB
      if (next !== current) handleTabChange(next)
      else setActiveTab(next)
      return
    }

    const visible = readVisibleCampaignTabs(detail.campaign.config)
    const visSet = new Set(visible)
    if (!visSet.has(current as ToggleableCampaignTabId)) {
      const next = visible.includes(DEFAULT_CAMPAIGN_TAB)
        ? DEFAULT_CAMPAIGN_TAB
        : (visible[0] ?? DEFAULT_CAMPAIGN_TAB)
      handleTabChange(next)
      return
    }
    setActiveTab(current)
  }, [detail.campaign, searchParams, handleTabChange, isClientWorkspace])

  const handleThemeChange = useCallback(
    async (themeId: string | null) => {
      const c = detail.campaign
      if (!c) return
      const config = (c.config as Record<string, unknown>) ?? {}
      const agentSettings = (config.agent_settings as Record<string, unknown>) ?? {}
      await updateCampaign(id, {
        config: {
          ...config,
          agent_settings: { ...agentSettings, theme_id: themeId },
        },
      })
      await detail.load()
    },
    [id, detail.campaign, detail.load],
  )

  const visibleNavIds = useMemo(
    () => readVisibleCampaignTabs(detail.campaign?.config),
    [detail.campaign?.config],
  )

  const handleVisibleTabIdsChange = useCallback(
    async (tabs: ToggleableCampaignTabId[]) => {
      const c = detail.campaign
      if (!c) return
      const config = (c.config as Record<string, unknown>) ?? {}
      await updateCampaign(id, {
        config: {
          ...config,
          visible_campaign_tabs: tabs,
        },
      })
      await detail.load()
      if (!tabs.includes(activeTab as ToggleableCampaignTabId)) {
        handleTabChange(tabs[0] ?? DEFAULT_CAMPAIGN_TAB)
      }
    },
    [activeTab, detail.campaign, detail.load, handleTabChange, id],
  )

  const headerNavTabs = useMemo(
    () =>
      isClientWorkspace
        ? [...CLIENT_WORKSPACE_NAV_TABS]
        : visibleNavIds.map((tabId) => ({
            value: tabId,
            label: CAMPAIGN_TAB_LABELS[tabId],
            icon: CAMPAIGN_TAB_ICONS[tabId],
          })),
    [isClientWorkspace, visibleNavIds],
  )

  const mobileTabsVisible = useMemo(
    () =>
      (isClientWorkspace ? CLIENT_WORKSPACE_NAV_TABS : visibleNavIds).map((tab) => {
        const tabId = typeof tab === 'string' ? tab : tab.value
        const label = typeof tab === 'string' ? CAMPAIGN_TAB_LABELS[tab] : tab.label
        return {
          value: tabId,
          label,
          icon: MOBILE_TAB_ICONS[tabId as ToggleableCampaignTabId] ?? LayoutGrid,
        }
      }),
    [isClientWorkspace, visibleNavIds],
  )

  const handleManageTeam = useCallback(() => {
    setTeamModalOpen(true)
  }, [])

  const createdSummary = useMemo(() => {
    const parts: string[] = []
    if (detail.offers.length > 0) parts.push(`${detail.offers.length} offer(s)`)
    if (detail.avatars.length > 0) parts.push(`${detail.avatars.length} avatar(s)`)
    if (detail.theme) parts.push('brand theme')
    return parts.length > 0 ? parts.join(', ') : ''
  }, [detail.offers.length, detail.avatars.length, detail.theme])

  const clientSpaceByCampaign = useMemo(
    () =>
      new Map(
        clientWorkspace?.campaign_spaces.map((row) => [
          row.page_grader_campaign_id,
          row.space_id,
        ]) ?? [],
      ),
    [clientWorkspace],
  )

  const updateClientCampaign = useCallback(
    async (clientCampaignId: string, patch: CampaignPatch) => {
      if (!pageGraderClientId) return
      setUpdatingClientCampaignId(clientCampaignId)
      setClientWorkspaceError(null)
      try {
        await updateAgencyWorkspaceEntity(pageGraderClientId, {
          kind: 'campaign',
          entity_id: clientCampaignId,
          patch,
        })
        const refreshed = await fetchAgencyClient(pageGraderClientId, false)
        setClientWorkspace(refreshed)
        setEditingClientCampaignId(null)
      } catch (reason) {
        setClientWorkspaceError(
          reason instanceof Error ? reason.message : 'Could not update client campaign',
        )
      } finally {
        setUpdatingClientCampaignId(null)
      }
    },
    [pageGraderClientId],
  )

  if (detail.loading || roleLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading campaign..." state="processing" size="lg" />
      </div>
    )
  }

  if (!detail.campaign) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Campaign not found
      </div>
    )
  }

  return (
    <div
      className={
        activeTab === 'canvas'
          ? 'flex h-full min-h-0 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6'
          : 'h-full overflow-y-auto px-4 py-4 md:px-6 md:py-6'
      }
    >
      {isMobile && (
        <div className="mb-3 flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('toggle-mobile-sidebar'))}
              className="chip-glass-neutral h-spacing-8 w-spacing-8 flex items-center justify-center rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <LucideIcon name={detail.campaignIcon} className="text-foreground h-4 w-4 shrink-0" />
              <span className="body-2 text-foreground min-w-0 truncate font-medium">
                {detail.campaign.name}
              </span>
            </div>
            <div className="w-spacing-8" />
          </div>
          <div className="scrollbar-hide gap-spacing-1 flex items-center justify-center overflow-x-auto py-1">
            {mobileTabsVisible.map((tab) => {
              const isActive = activeTab === tab.value
              const Icon = tab.icon
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => handleTabChange(tab.value)}
                  className={`gap-spacing-2 h-spacing-8 rounded-spacing-3 flex items-center transition-all duration-[600ms] ease-in-out ${isActive ? 'chip-glass-blue px-spacing-3' : 'chip-glass-neutral px-spacing-2'}`}
                >
                  <Icon className="h-4 w-4" />
                  {isActive && (
                    <span className="body-2 whitespace-nowrap font-semibold">{tab.label}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={activeTab === 'canvas' ? 'flex min-h-0 flex-1 flex-col' : 'space-y-spacing-6'}
      >
        {!isMobile && (
          <CampaignHeader
            campaign={detail.campaign}
            campaignIcon={detail.campaignIcon}
            campaignIconColor={detail.campaignIconColor}
            navTabs={headerNavTabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            editingName={detail.editingName}
            nameValue={detail.nameValue}
            saveStatus={autosave.saveStatus}
            context={detail.context}
            resources={detail.resources}
            setNameValue={detail.setNameValue}
            setEditingName={detail.setEditingName}
            onNameSave={detail.handleNameSave}
            onIconChange={detail.handleIconChange}
            onIconColorChange={detail.handleIconColorChange}
            onRetrySave={autosave.performSave}
            visibleTabIds={visibleNavIds}
            onVisibleTabIdsChange={(tabs) => void handleVisibleTabIdsChange(tabs)}
            fixedTabs={isClientWorkspace}
          />
        )}

        <TabsContent value="overview" className="animate-tab-enter">
          {isClientWorkspace ? (
            clientWorkspaceLoading && !clientWorkspace ? (
              <VibeyLoadingOrb text="Loading client workspace…" state="processing" />
            ) : clientWorkspaceError && !clientWorkspace ? (
              <p className="surface-card body-2 text-destructive rounded-spacing-3 p-spacing-4">
                {clientWorkspaceError}
              </p>
            ) : clientWorkspace ? (
              <AgencyClientWorkspaceOverview
                campaignId={id}
                workspace={clientWorkspace}
                onOpenTasks={() => handleTabChange('list')}
              />
            ) : null
          ) : (
            <CampaignOverviewTab
              campaignId={id}
              campaignName={detail.campaign.name}
              dashboardMissions={detail.dashboardMissions}
              dashboardAgents={detail.dashboardAgents}
              campaignTeam={detail.campaignTeam}
              onOpenTab={(tab) => handleTabChange(tab)}
              onManageTeam={handleManageTeam}
            />
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="animate-tab-enter">
          {isClientWorkspace && clientWorkspace && pageGraderClientId ? (
            <AgencyClientCampaignsPanel
              clientId={pageGraderClientId}
              client={clientWorkspace.client}
              campaigns={clientWorkspace.campaigns}
              spaceByCampaign={clientSpaceByCampaign}
              editingCampaignId={editingClientCampaignId}
              updatingId={updatingClientCampaignId}
              onEdit={setEditingClientCampaignId}
              onCancel={() => setEditingClientCampaignId(null)}
              onSave={updateClientCampaign}
            />
          ) : (
            <CampaignDashboardTab
              campaignId={id}
              campaignName={detail.campaign.name}
              dashboardMissions={detail.dashboardMissions}
              dashboardAgents={detail.dashboardAgents}
              onTeamChange={detail.load}
              completionChartType={completionChartType}
              setCompletionChartType={setCompletionChartType}
              chartDropdownOpen={chartDropdownOpen}
              setChartDropdownOpen={setChartDropdownOpen}
              completionDays={completionDays}
              setCompletionDays={setCompletionDays}
              timeframeDropdownOpen={timeframeDropdownOpen}
              setTimeframeDropdownOpen={setTimeframeDropdownOpen}
            />
          )}
        </TabsContent>

        <TabsContent value="list" className="animate-tab-enter">
          <CampaignTaskTab campaignId={id} view="list" />
        </TabsContent>

        <TabsContent value="board" className="animate-tab-enter">
          <CampaignTaskTab campaignId={id} view="board" />
        </TabsContent>

        <TabsContent value="calendar" className="animate-tab-enter">
          {isClientWorkspace && clientWorkspace ? (
            <AgencyClientMeetingsPanel campaignId={id} workspace={clientWorkspace} />
          ) : (
            <CampaignTaskTab campaignId={id} view="calendar" />
          )}
        </TabsContent>

        <TabsContent value="canvas" className="animate-tab-enter flex min-h-0 flex-1">
          <CampaignCanvasView campaignId={id} />
        </TabsContent>

        <TabsContent value="assets" className="animate-tab-enter">
          <CampaignAssetsTab campaignId={id} />
        </TabsContent>

        <TabsContent value="knowledge" className="animate-tab-enter">
          <div className="gap-spacing-6 flex flex-col">
            {isClientWorkspace ? <CampaignAssetsTab campaignId={id} /> : null}
            <CampaignKnowledgeTab
              campaignId={id}
              offers={detail.offers}
              avatars={detail.avatars}
              theme={detail.theme}
              onThemeChange={handleThemeChange}
              offerPage={offerPage}
              setOfferPage={setOfferPage}
              avatarPage={avatarPage}
              setAvatarPage={setAvatarPage}
              dashboardAgents={detail.dashboardAgents}
              onManageTeam={handleManageTeam}
            />
          </div>
        </TabsContent>

        <TabsContent value="reporting" className="animate-tab-enter min-h-0">
          <CampaignReportingTab campaignId={id} campaignName={detail.campaign.name} />
        </TabsContent>
      </Tabs>

      <CampaignTeamManageModal
        open={teamModalOpen}
        onOpenChange={setTeamModalOpen}
        campaignId={id}
        campaignName={detail.campaign.name}
        campaignTeam={detail.campaignTeam}
        onTeamChange={() => void detail.load()}
        context={detail.context}
        createdSummary={createdSummary}
      />
    </div>
  )
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
