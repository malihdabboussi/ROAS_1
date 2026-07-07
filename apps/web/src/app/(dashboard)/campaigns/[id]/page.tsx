'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, DollarSign, Menu } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import { Tabs, TabsContent } from '@/components/ui/navigation/tabs'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { updateCampaign } from '@/features/studio/services/campaign.service'
import { useUserRole } from '@/hooks/use-user-role'
import { CampaignHeader } from './_components/CampaignHeader'
import { CampaignDashboardTab } from './_components/tabs/CampaignDashboardTab'
import { CampaignKnowledgeTab } from './_components/tabs/CampaignKnowledgeTab'
import { useCampaignAutosave } from './_hooks/use-campaign-autosave'
import { useCampaignDetailData } from './_hooks/use-campaign-detail-data'
import {
  CAMPAIGN_TAB_LABELS,
  readVisibleCampaignTabs,
  type ToggleableCampaignTabId,
} from './_lib/campaign-nav-tabs'
import { CampaignFinanceTab } from './CampaignFinanceTab'

const MOBILE_TAB_ICONS = {
  dashboard: BarChart3,
  finance: DollarSign,
  knowledge: BookOpen,
} as const

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: roleLoading } = useUserRole()
  const [isMobile, setIsMobile] = useState(false)

  const VALID_TABS = ['dashboard', 'finance', 'knowledge'] as const
  const tabParam = searchParams.get('tab')
  const initialTab = VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
    ? tabParam!
    : 'dashboard'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [completionChartType, setCompletionChartType] = useState<'bar' | 'area' | 'line' | 'pie'>(
    'bar',
  )
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false)
  const [completionDays, setCompletionDays] = useState(14)
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false)
  const [offerPage, setOfferPage] = useState(0)
  const [avatarPage, setAvatarPage] = useState(0)

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
      if (value === 'dashboard') params.delete('tab')
      else params.set('tab', value)
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
    const tabParam = searchParams.get('tab')
    let current =
      tabParam && VALID_TABS.includes(tabParam as (typeof VALID_TABS)[number])
        ? tabParam
        : 'dashboard'
    if (!detail.campaign) {
      setActiveTab(current)
      return
    }

    const visible = readVisibleCampaignTabs(detail.campaign.config)
    const visSet = new Set(visible)
    if (!visSet.has(current as ToggleableCampaignTabId)) {
      const next = visible.includes('dashboard') ? 'dashboard' : (visible[0] ?? 'dashboard')
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

  const headerNavTabs = useMemo(() => {
    return visibleNavIds.map((id) => ({
      value: id,
      label: CAMPAIGN_TAB_LABELS[id],
    }))
  }, [visibleNavIds])

  const mobileTabsVisible = useMemo(() => {
    return visibleNavIds.map((id) => ({
      value: id,
      label: CAMPAIGN_TAB_LABELS[id],
      icon: MOBILE_TAB_ICONS[id],
    }))
  }, [visibleNavIds])

  if (detail.loading || roleLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <VibeyLoadingOrb text="Loading campaign..." state="processing" size="lg" />
      </div>
    )
  }

  if (!detail.campaign) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
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
              <LucideIcon
                name={detail.campaignIcon}
                className="h-4 w-4 shrink-0 text-[var(--color-foreground)]"
              />
              <span className="body-2 min-w-0 truncate font-medium text-[var(--color-foreground)]">
                {detail.campaign.name}
              </span>
            </div>
            <div className="w-spacing-8" />
          </div>
          <div
            className="gap-spacing-1 flex items-center justify-center overflow-x-auto py-1"
            style={{ scrollbarWidth: 'none' }}
          >
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
          />
        )}

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

        <TabsContent value="finance">
          <CampaignFinanceTab campaignId={id} campaignName={detail.campaign.name} />
        </TabsContent>

        <TabsContent value="knowledge" className="animate-tab-enter">
          <CampaignKnowledgeTab
            offers={detail.offers}
            avatars={detail.avatars}
            theme={detail.theme}
            onThemeChange={handleThemeChange}
            offerPage={offerPage}
            setOfferPage={setOfferPage}
            avatarPage={avatarPage}
            setAvatarPage={setAvatarPage}
            dashboardAgents={detail.dashboardAgents}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
