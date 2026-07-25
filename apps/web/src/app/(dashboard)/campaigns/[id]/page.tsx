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
  PieChart,
} from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tabs, TabsContent } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { updateCampaign } from '@/features/studio/services/campaign.service'
import { CampaignTeamManageModal } from '@/features/team/components/CampaignTeamManageModal'
import { useUserRole } from '@/hooks/use-user-role'
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
  assets: FolderOpen,
  knowledge: BookOpen,
  reporting: PieChart,
}

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
  }, [detail.campaign, searchParams, handleTabChange])

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

  const headerNavTabs = useMemo(() => {
    return visibleNavIds.map((tabId) => ({
      value: tabId,
      label: CAMPAIGN_TAB_LABELS[tabId],
    }))
  }, [visibleNavIds])

  const mobileTabsVisible = useMemo(() => {
    return visibleNavIds.map((tabId) => ({
      value: tabId,
      label: CAMPAIGN_TAB_LABELS[tabId],
      icon: MOBILE_TAB_ICONS[tabId] ?? LayoutGrid,
    }))
  }, [visibleNavIds])

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
    <div className="h-full overflow-y-auto px-4 py-4 md:px-6 md:py-6">
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-spacing-6">
        {!isMobile && (
          <CampaignHeader
            campaign={detail.campaign}
            campaignIcon={detail.campaignIcon}
            campaignIconColor={detail.campaignIconColor}
            navTabs={headerNavTabs}
            onTabChange={handleTabChange}
            isMobile={isMobile}
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
          />
        )}

        <TabsContent value="overview" className="animate-tab-enter">
          <CampaignOverviewTab
            campaignId={id}
            campaignName={detail.campaign.name}
            dashboardMissions={detail.dashboardMissions}
            dashboardAgents={detail.dashboardAgents}
            campaignTeam={detail.campaignTeam}
            onOpenTab={(tab) => handleTabChange(tab)}
            onManageTeam={handleManageTeam}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="animate-tab-enter">
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
        </TabsContent>

        <TabsContent value="list" className="animate-tab-enter">
          <CampaignTaskTab campaignId={id} view="list" />
        </TabsContent>

        <TabsContent value="board" className="animate-tab-enter">
          <CampaignTaskTab campaignId={id} view="board" />
        </TabsContent>

        <TabsContent value="calendar" className="animate-tab-enter">
          <CampaignTaskTab campaignId={id} view="calendar" />
        </TabsContent>

        <TabsContent value="assets" className="animate-tab-enter">
          <CampaignAssetsTab campaignId={id} />
        </TabsContent>

        <TabsContent value="knowledge" className="animate-tab-enter">
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
