import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { billingApi } from '@/lib/billing/billing-api'
import type { AdCampaign, Presentation } from '../../../types'
import {
  fetchCampaignAdCampaigns,
  fetchCampaignFunnels,
  fetchCampaignPresentations,
  getMetaConnectionStatus,
  type Funnel,
} from '../../../services/artifact-preview.service'
import { fetchCampaign } from '../../../services/campaign.service'

type MetaAccountOption = {
  id: string
  name: string
}

interface UseSettingsTabLoadSettingsOptions {
  campaignId: string
  setCampaignConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  setMediaGenerationEnabled: Dispatch<SetStateAction<boolean>>
  setCampaignModelStrategy: Dispatch<SetStateAction<string>>
  setIsFreeUser: Dispatch<SetStateAction<boolean>>
  setFunnels: Dispatch<SetStateAction<Funnel[]>>
  setPresentations: Dispatch<SetStateAction<Presentation[]>>
  setAdCampaigns: Dispatch<SetStateAction<AdCampaign[]>>
  setMetaConnected: Dispatch<SetStateAction<boolean | null>>
  setMetaAdAccounts: Dispatch<SetStateAction<MetaAccountOption[]>>
  setMetaPages: Dispatch<SetStateAction<MetaAccountOption[]>>
  normalizeModelStrategy: (modelStrategy: string | undefined) => string
}

export function useSettingsTabLoadSettings({
  campaignId,
  setCampaignConfig,
  setMediaGenerationEnabled,
  setCampaignModelStrategy,
  setIsFreeUser,
  setFunnels,
  setPresentations,
  setAdCampaigns,
  setMetaConnected,
  setMetaAdAccounts,
  setMetaPages,
  normalizeModelStrategy,
}: UseSettingsTabLoadSettingsOptions) {
  const [settingsLoading, setSettingsLoading] = useState(true)

  const loadSettings = useCallback(async () => {
    if (!campaignId) {
      setSettingsLoading(false)
      return
    }
    try {
      setSettingsLoading(true)
      const [
        campaign,
        campaignFunnels,
        campaignPresentations,
        billingStatus,
        campaignAdCampaigns,
        metaStatus,
      ] = await Promise.all([
        fetchCampaign(campaignId),
        fetchCampaignFunnels(campaignId),
        fetchCampaignPresentations(campaignId),
        billingApi.getStatus(),
        fetchCampaignAdCampaigns(campaignId),
        getMetaConnectionStatus().catch(() => ({
          connected: false as const,
          adAccounts: null,
          pages: null,
        })),
      ])
      const config = (campaign.config ?? {}) as Record<string, unknown>
      const agentSettings = (config.agent_settings as Record<string, unknown> | undefined) ?? {}
      const mediaEnabled = agentSettings.media_generation_enabled as boolean | undefined
      const modelStrategy = agentSettings.model_strategy as string | undefined
      setCampaignConfig(config)
      setMediaGenerationEnabled(mediaEnabled !== false)
      setCampaignModelStrategy(normalizeModelStrategy(modelStrategy))
      setIsFreeUser(!billingStatus?.plan || billingStatus.plan.slug === 'free')
      setFunnels(campaignFunnels)
      setPresentations(campaignPresentations)
      setAdCampaigns(campaignAdCampaigns)
      setMetaConnected(metaStatus.connected)
      if (metaStatus.connected) {
        if (metaStatus.adAccounts) setMetaAdAccounts(metaStatus.adAccounts)
        if (metaStatus.pages) setMetaPages(metaStatus.pages)
      }
    } catch {
      setCampaignConfig({})
      setMediaGenerationEnabled(true)
      setCampaignModelStrategy('auto')
      setIsFreeUser(true)
      setFunnels([])
      setPresentations([])
      setAdCampaigns([])
    } finally {
      setSettingsLoading(false)
    }
  }, [
    campaignId,
    normalizeModelStrategy,
    setAdCampaigns,
    setCampaignConfig,
    setCampaignModelStrategy,
    setFunnels,
    setIsFreeUser,
    setMediaGenerationEnabled,
    setMetaAdAccounts,
    setMetaConnected,
    setMetaPages,
    setPresentations,
  ])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  return { settingsLoading, loadSettings }
}
