import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchMissionAgents,
  fetchMissions,
} from '@/features/mission-control/services/missions.service'
import type { Mission, MissionAgent } from '@/features/mission-control/types'
import {
  fetchCampaignStripeOverview,
  fetchStripeIntegrationStatus,
} from '@/features/studio/services/analytics.service'
import {
  fetchCampaign,
  fetchCampaignTeam,
  updateCampaign,
  type CampaignTeamAgent,
} from '@/features/studio/services/campaign.service'
import type { Campaign } from '@/features/studio/types'
import { getTheme } from '@/features/themes/services/themes.service'
import type { Theme } from '@/features/themes/types'
import { backendGet } from '@/lib/api/backend-client'
import { defaultContext, defaultResources } from '../_lib/constants'
import type { CampaignContext, CampaignResources } from '../_lib/types'

interface UseCampaignDetailDataArgs {
  campaignId: string
  roleLoading: boolean
  canAccess: boolean
}

export function useCampaignDetailData({
  campaignId,
  roleLoading: _roleLoading,
  canAccess: _canAccess,
}: UseCampaignDetailDataArgs) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<CampaignContext>(defaultContext)
  const [resources, setResources] = useState<CampaignResources>(defaultResources)
  const [offers, setOffers] = useState<any[]>([])
  const [avatars, setAvatars] = useState<any[]>([])
  const [theme, setTheme] = useState<Theme | null>(null)
  const [dashboardMissions, setDashboardMissions] = useState<Mission[]>([])
  const [dashboardAgents, setDashboardAgents] = useState<MissionAgent[]>([])
  const [campaignTeam, setCampaignTeam] = useState<CampaignTeamAgent[]>([])
  const [campaignIcon, setCampaignIcon] = useState('folder-kanban')
  const [campaignIconColor, setCampaignIconColor] = useState<string | undefined>(undefined)
  const [nameValue, setNameValue] = useState('')
  const [editingName, setEditingName] = useState(false)
  const dataReadyRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const [c, off, av, missions, agents, campaignAgents] = await Promise.all([
        fetchCampaign(campaignId),
        backendGet<any[]>(`/api/campaigns/${campaignId}/offers`).catch(() => []),
        backendGet<any[]>(`/api/campaigns/${campaignId}/avatars`).catch(() => []),
        fetchMissions({ campaign_id: campaignId, limit: 100 }).catch(() => []),
        fetchMissionAgents().catch(() => []),
        fetchCampaignTeam(campaignId).catch(() => []),
      ])
      setCampaign(c)
      setNameValue(c.name)
      setCampaignIcon(((c.config as Record<string, unknown>)?.icon as string) ?? 'folder-kanban')
      setCampaignIconColor(
        ((c.config as Record<string, unknown>)?.icon_color as string) ?? undefined,
      )
      setContext({ ...defaultContext, ...((c as any).context || {}) })
      setResources({ ...defaultResources, ...((c as any).resources || {}) })
      setOffers(off)
      setAvatars(av)
      setDashboardMissions(missions)
      const campaignAgentKeys = new Set(campaignAgents.map((a) => a.agent_key))
      // Only show agents assigned to this campaign (no fallback to full org — that hid empty assignments).
      setDashboardAgents(agents.filter((a) => campaignAgentKeys.has(a.agent_key)))
      setCampaignTeam(campaignAgents)

      const config = (c as any).config as Record<string, unknown> | undefined
      const agentSettings = (config?.agent_settings as Record<string, unknown> | undefined) ?? {}
      const themeId = agentSettings.theme_id as string | null | undefined
      const resolvedThemeId = themeId || null
      if (resolvedThemeId) {
        getTheme(resolvedThemeId)
          .then(setTheme)
          .catch(() => setTheme(null))
      } else {
        setTheme(null)
      }

      setTimeout(() => {
        dataReadyRef.current = true
      }, 100)
    } finally {
      setLoading(false)
    }

    try {
      const stripeStatus = await fetchStripeIntegrationStatus()
      if (stripeStatus.connected) {
        const fromUnix = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
        const toUnix = Math.floor(Date.now() / 1000)
        await fetchCampaignStripeOverview(campaignId, fromUnix, toUnix)
      }
    } catch {
      // preserve existing non-blocking behavior
    }
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  const handleNameSave = useCallback(async () => {
    setEditingName(false)
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === campaign?.name) return
    await updateCampaign(campaignId, { name: trimmed })
    setCampaign((prev) => (prev ? { ...prev, name: trimmed } : prev))
  }, [campaignId, nameValue, campaign?.name])

  const handleIconChange = useCallback(
    async (icon: string) => {
      setCampaignIcon(icon)
      const prevConfig = (campaign?.config as Record<string, unknown>) ?? {}
      await updateCampaign(campaignId, { config: { ...prevConfig, icon } })
      setCampaign((prev) =>
        prev ? { ...prev, config: { ...(prev.config as Record<string, unknown>), icon } } : prev,
      )
    },
    [campaignId, campaign?.config],
  )

  const handleIconColorChange = useCallback(
    async (iconColor: string) => {
      setCampaignIconColor(iconColor)
      const prevConfig = (campaign?.config as Record<string, unknown>) ?? {}
      await updateCampaign(campaignId, { config: { ...prevConfig, icon_color: iconColor } })
      setCampaign((prev) =>
        prev
          ? {
              ...prev,
              config: { ...(prev.config as Record<string, unknown>), icon_color: iconColor },
            }
          : prev,
      )
    },
    [campaignId, campaign?.config],
  )

  return {
    campaign,
    setCampaign,
    loading,
    context,
    setContext,
    resources,
    setResources,
    offers,
    avatars,
    theme,
    dashboardMissions,
    dashboardAgents,
    campaignTeam,
    campaignIcon,
    nameValue,
    setNameValue,
    editingName,
    setEditingName,
    dataReadyRef,
    load,
    handleNameSave,
    handleIconChange,
    campaignIconColor,
    handleIconColorChange,
  }
}
