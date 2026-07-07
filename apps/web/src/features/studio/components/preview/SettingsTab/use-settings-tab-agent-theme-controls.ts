import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { STUDIO_INLINE_ERRORS } from '@/features/studio/config/studio-inline-errors.config'
import { updateCampaign } from '../../../services/campaign.service'

interface UseSettingsTabAgentThemeControlsOptions {
  campaignId: string
  campaignConfig: Record<string, unknown>
  setCampaignConfig: Dispatch<SetStateAction<Record<string, unknown>>>
  mediaGenerationEnabled: boolean
  setMediaGenerationEnabled: Dispatch<SetStateAction<boolean>>
  campaignModelStrategy: string
  setCampaignModelStrategy: Dispatch<SetStateAction<string>>
}

function campaignAgentSettings(config: Record<string, unknown>) {
  return ((config.agent_settings as Record<string, unknown> | undefined) ?? {}) as Record<
    string,
    unknown
  >
}

export function useSettingsTabAgentThemeControls({
  campaignId,
  campaignConfig,
  setCampaignConfig,
  mediaGenerationEnabled,
  setMediaGenerationEnabled,
  campaignModelStrategy,
  setCampaignModelStrategy,
}: UseSettingsTabAgentThemeControlsOptions) {
  const [savingAgentSettings, setSavingAgentSettings] = useState(false)

  const handleMediaGenerationToggle = useCallback(
    async (enabled: boolean) => {
      const previousEnabled = mediaGenerationEnabled
      const previousConfig = campaignConfig
      const nextConfig: Record<string, unknown> = {
        ...campaignConfig,
        agent_settings: {
          ...campaignAgentSettings(campaignConfig),
          media_generation_enabled: enabled,
        },
      }

      setMediaGenerationEnabled(enabled)
      setCampaignConfig(nextConfig)
      setSavingAgentSettings(true)
      try {
        await updateCampaign(campaignId, { config: nextConfig })
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setMediaGenerationEnabled(previousEnabled)
        setCampaignConfig(previousConfig)
      } finally {
        setSavingAgentSettings(false)
      }
    },
    [campaignId, campaignConfig, mediaGenerationEnabled, setCampaignConfig, setMediaGenerationEnabled],
  )

  const handleModelStrategyChange = useCallback(
    async (strategyId: string) => {
      const previousStrategy = campaignModelStrategy
      const previousConfig = campaignConfig
      const nextConfig: Record<string, unknown> = {
        ...campaignConfig,
        agent_settings: {
          ...campaignAgentSettings(campaignConfig),
          model_strategy: strategyId,
        },
      }

      setCampaignModelStrategy(strategyId)
      setCampaignConfig(nextConfig)
      setSavingAgentSettings(true)
      try {
        await updateCampaign(campaignId, { config: nextConfig })
        window.dispatchEvent(new Event('campaign-config-updated'))
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setCampaignModelStrategy(previousStrategy)
        setCampaignConfig(previousConfig)
      } finally {
        setSavingAgentSettings(false)
      }
    },
    [campaignId, campaignConfig, campaignModelStrategy, setCampaignConfig, setCampaignModelStrategy],
  )

  const handleThemeChange = useCallback(
    async (themeId: string | null) => {
      const previousConfig = campaignConfig
      const nextConfig: Record<string, unknown> = {
        ...campaignConfig,
        agent_settings: {
          ...campaignAgentSettings(campaignConfig),
          theme_id: themeId,
        },
      }

      setCampaignConfig(nextConfig)
      setSavingAgentSettings(true)
      try {
        await updateCampaign(campaignId, { config: nextConfig })
        window.dispatchEvent(new Event('campaign-config-updated'))
      } catch {
        toast.error(STUDIO_INLINE_ERRORS.SAVE_SETTINGS)
        setCampaignConfig(previousConfig)
      } finally {
        setSavingAgentSettings(false)
      }
    },
    [campaignId, campaignConfig, setCampaignConfig],
  )

  return {
    savingAgentSettings,
    handleMediaGenerationToggle,
    handleModelStrategyChange,
    handleThemeChange,
  }
}
