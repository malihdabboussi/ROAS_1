import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { updateCampaign } from '../../../services/campaign.service'
import { useSettingsTabAgentThemeControls } from './use-settings-tab-agent-theme-controls'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

vi.mock('../../../services/campaign.service', () => ({
  updateCampaign: vi.fn().mockResolvedValue({}),
}))

afterEach(() => {
  vi.clearAllMocks()
})

function useHarness() {
  const [campaignConfig, setCampaignConfig] = useState<Record<string, unknown>>({
    agent_settings: {
      theme_id: 'theme-1',
      media_generation_enabled: true,
      model_strategy: 'auto',
    },
  })
  const [mediaGenerationEnabled, setMediaGenerationEnabled] = useState(true)
  const [campaignModelStrategy, setCampaignModelStrategy] = useState('auto')
  const controls = useSettingsTabAgentThemeControls({
    campaignId: 'campaign-1',
    campaignConfig,
    setCampaignConfig,
    mediaGenerationEnabled,
    setMediaGenerationEnabled,
    campaignModelStrategy,
    setCampaignModelStrategy,
  })

  return {
    campaignConfig,
    mediaGenerationEnabled,
    campaignModelStrategy,
    ...controls,
  }
}

describe('useSettingsTabAgentThemeControls', () => {
  it('optimistically saves media-generation settings into campaign config', async () => {
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleMediaGenerationToggle(false)
    })

    expect(updateCampaign).toHaveBeenCalledWith('campaign-1', {
      config: {
        agent_settings: {
          theme_id: 'theme-1',
          media_generation_enabled: false,
          model_strategy: 'auto',
        },
      },
    })
    expect(result.current.mediaGenerationEnabled).toBe(false)
    expect(
      (result.current.campaignConfig.agent_settings as Record<string, unknown>)
        .media_generation_enabled,
    ).toBe(false)
  })

  it('rolls back model strategy when the save fails', async () => {
    vi.mocked(updateCampaign).mockRejectedValueOnce(new Error('failed'))
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleModelStrategyChange('speed')
    })

    expect(toast.error).toHaveBeenCalled()
    expect(result.current.campaignModelStrategy).toBe('auto')
    expect((result.current.campaignConfig.agent_settings as Record<string, unknown>).model_strategy).toBe(
      'auto',
    )
  })

  it('saves theme changes and dispatches the campaign config update event', async () => {
    const listener = vi.fn()
    window.addEventListener('campaign-config-updated', listener)
    const { result } = renderHook(() => useHarness())

    await act(async () => {
      await result.current.handleThemeChange('theme-2')
    })

    window.removeEventListener('campaign-config-updated', listener)
    expect(updateCampaign).toHaveBeenCalledWith('campaign-1', {
      config: {
        agent_settings: {
          theme_id: 'theme-2',
          media_generation_enabled: true,
          model_strategy: 'auto',
        },
      },
    })
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
